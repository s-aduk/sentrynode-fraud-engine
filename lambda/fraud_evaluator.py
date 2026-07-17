"""
SentryNode Fraud Engine — fraud_evaluator.py

Triggered by SQS (batches of 10) from the ingestion queue. For every record:
  1. Parse + validate the transaction payload.
  2. Run the Phase 1 heuristic scorer (see README.md in this folder for the
     "what a real engine needs" upgrade notes — this is NOT ML, by design).
  3. Write an audit row to DynamoDB (dynamodb:PutItem only).
  4. If high-risk, publish to SNS (sns:Publish only) for email/chat fan-out.

Uses SQS partial batch failure reporting (ReportBatchItemFailures) so one
bad record never drops or blocks the rest of the batch — every record is
processed independently in its own try/except, and only the message IDs
that actually failed are returned to SQS for individual retry/DLQ.
"""

import json
import logging
import os
import re
import time
import uuid
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Tuple

import boto3

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

dynamodb = boto3.resource("dynamodb")
sns = boto3.client("sns")

TABLE_NAME = os.environ.get("AUDIT_TABLE_NAME", "")
TOPIC_ARN = os.environ.get("ALERT_TOPIC_ARN", "")

# --- Phase 1 heuristic configuration -----------------------------------
# Deterministic, rule-based scoring only. This is a placeholder for a real
# rules/ML engine — see lambda/README.md "Upgrade path" section.
HIGH_AMOUNT_THRESHOLD = Decimal(os.environ.get("HIGH_AMOUNT_THRESHOLD", "10000"))
HIGH_RISK_COUNTRIES = frozenset(
    (os.environ.get("HIGH_RISK_COUNTRIES", "KP,IR,SY,CU") or "").split(",")
)
HIGH_RISK_SCORE_FLAG = int(os.environ.get("HIGH_RISK_SCORE_FLAG", "50"))

WEIGHT_AMOUNT = 60
WEIGHT_COUNTRY = 30
WEIGHT_IP_ANOMALY = 15
MAX_SCORE = 100

_IP_RE = re.compile(
    r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$"
)
_COUNTRY_RE = re.compile(r"^[A-Z]{2}$")

# Private / reserved ranges used as a stand-in "IP anomaly" heuristic for
# Phase 1 (e.g. a transaction claiming to originate from a non-routable
# address is treated as suspicious). Not a real IP-reputation/velocity
# check — see README for the real upgrade.
_PRIVATE_PREFIXES = ("10.", "192.168.", "127.")


class ValidationError(Exception):
    """Raised when a transaction payload fails validation."""


def _require_fields(payload: Dict[str, Any]) -> None:
    required = ["cardholder_name", "amount", "ip_address", "country_code"]
    missing = [f for f in required if f not in payload or payload[f] in (None, "")]
    if missing:
        raise ValidationError(f"missing required field(s): {', '.join(missing)}")


def _parse_amount(raw: Any) -> Decimal:
    try:
        amount = Decimal(str(raw))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(f"amount is not a valid number: {raw!r}")
    if amount < 0:
        raise ValidationError("amount must be non-negative")
    if amount != amount or amount in (Decimal("Infinity"), Decimal("-Infinity")):
        raise ValidationError("amount must be finite")
    return amount


def _parse_country(raw: Any) -> str:
    code = str(raw).strip().upper()
    if not _COUNTRY_RE.match(code):
        raise ValidationError(f"country_code must be a 2-letter ISO code: {raw!r}")
    return code


def _parse_ip(raw: Any) -> str:
    ip = str(raw).strip()
    match = _IP_RE.match(ip)
    if not match:
        raise ValidationError(f"ip_address is not a valid IPv4 address: {raw!r}")
    if any(int(octet) > 255 for octet in match.groups()):
        raise ValidationError(f"ip_address has an out-of-range octet: {raw!r}")
    return ip


def validate_transaction(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and normalize a raw transaction payload.

    Raises ValidationError with a specific, actionable message on any
    malformed or missing field. Never raises an unhandled exception type.
    """
    if not isinstance(payload, dict):
        raise ValidationError("payload must be a JSON object")

    _require_fields(payload)

    cardholder_name = str(payload["cardholder_name"]).strip()
    if not cardholder_name:
        raise ValidationError("cardholder_name must not be blank")

    amount = _parse_amount(payload["amount"])
    country_code = _parse_country(payload["country_code"])
    ip_address = _parse_ip(payload["ip_address"])

    return {
        "cardholder_name": cardholder_name,
        "amount": amount,
        "country_code": country_code,
        "ip_address": ip_address,
    }


def score_transaction(transaction: Dict[str, Any]) -> Tuple[int, List[str]]:
    """Deterministic heuristic scorer. Returns (score 0-100, reasons)."""
    score = 0
    reasons: List[str] = []

    if transaction["amount"] >= HIGH_AMOUNT_THRESHOLD:
        score += WEIGHT_AMOUNT
        reasons.append(
            f"amount {transaction['amount']} >= threshold {HIGH_AMOUNT_THRESHOLD}"
        )

    if transaction["country_code"] in HIGH_RISK_COUNTRIES:
        score += WEIGHT_COUNTRY
        reasons.append(f"country_code {transaction['country_code']} is high-risk")

    if transaction["ip_address"].startswith(_PRIVATE_PREFIXES):
        score += WEIGHT_IP_ANOMALY
        reasons.append(
            f"ip_address {transaction['ip_address']} is a non-routable/private "
            "address (placeholder IP-anomaly heuristic)"
        )

    score = min(score, MAX_SCORE)
    return score, reasons


def _put_audit_row(record_id: str, transaction: Dict[str, Any], score: int,
                    reasons: List[str], is_high_risk: bool) -> None:
    if not TABLE_NAME:
        raise RuntimeError("AUDIT_TABLE_NAME environment variable is not set")

    table = dynamodb.Table(TABLE_NAME)
    table.put_item(
        Item={
            "transaction_id": record_id,
            "cardholder_name": transaction["cardholder_name"],
            "amount": transaction["amount"],
            "country_code": transaction["country_code"],
            "ip_address": transaction["ip_address"],
            "risk_score": score,
            "is_high_risk": is_high_risk,
            "reasons": reasons,
            "evaluated_at": int(time.time()),
        }
    )


def _publish_alert(record_id: str, transaction: Dict[str, Any], score: int,
                    reasons: List[str]) -> None:
    if not TOPIC_ARN:
        raise RuntimeError("ALERT_TOPIC_ARN environment variable is not set")

    message = {
        "transaction_id": record_id,
        "cardholder_name": transaction["cardholder_name"],
        "amount": str(transaction["amount"]),
        "country_code": transaction["country_code"],
        "risk_score": score,
        "reasons": reasons,
    }
    sns.publish(
        TopicArn=TOPIC_ARN,
        Subject=f"SentryNode: high-risk transaction ({score}/100)",
        Message=json.dumps(message),
    )


def process_record(record: Dict[str, Any]) -> None:
    """Process a single SQS record end-to-end. Raises on failure so the
    caller can report just this message ID back to SQS."""
    body_raw = record.get("body", "")
    try:
        payload = json.loads(body_raw)
    except (json.JSONDecodeError, TypeError) as exc:
        raise ValidationError(f"body is not valid JSON: {exc}") from exc

    transaction = validate_transaction(payload)
    score, reasons = score_transaction(transaction)
    is_high_risk = score >= HIGH_RISK_SCORE_FLAG

    record_id = payload.get("transaction_id") or str(uuid.uuid4())

    _put_audit_row(record_id, transaction, score, reasons, is_high_risk)

    if is_high_risk:
        _publish_alert(record_id, transaction, score, reasons)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda entrypoint. Returns batchItemFailures for SQS partial-batch
    failure reporting so healthy records in the batch still succeed."""
    failures: List[Dict[str, str]] = []

    for record in event.get("Records", []):
        message_id = record.get("messageId", "unknown")
        try:
            process_record(record)
        except ValidationError as exc:
            # Malformed payload: log and fail only this message. It will
            # retry up to maxReceiveCount times, then land in the DLQ.
            logger.warning("Validation failed for message %s: %s", message_id, exc)
            failures.append({"itemIdentifier": message_id})
        except Exception as exc:  # noqa: BLE001 - isolate any unexpected error
            logger.error("Unexpected error for message %s: %s", message_id, exc)
            failures.append({"itemIdentifier": message_id})

    return {"batchItemFailures": failures}
