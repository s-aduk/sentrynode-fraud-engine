"""
Unit tests for fraud_evaluator.py

Run with:  python -m pytest lambda/tests -v
(from the lambda/ folder, or repo root with PYTHONPATH=lambda)

Covers: field validation (missing/malformed), boundary conditions on
scoring thresholds, score capping at 100, and batch-level isolation
(one bad record must not affect others in the same batch).
"""

import json
import os
import sys
from decimal import Decimal
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import fraud_evaluator as fe  # noqa: E402


# --------------------------------------------------------------------------
# validate_transaction
# --------------------------------------------------------------------------

def test_validate_transaction_happy_path():
    payload = {
        "cardholder_name": "Ama Owusu",
        "amount": "250.50",
        "ip_address": "8.8.8.8",
        "country_code": "gh",
    }
    result = fe.validate_transaction(payload)
    assert result["cardholder_name"] == "Ama Owusu"
    assert result["amount"] == Decimal("250.50")
    assert result["country_code"] == "GH"  # normalized to uppercase
    assert result["ip_address"] == "8.8.8.8"


def test_validate_transaction_missing_fields():
    payload = {"cardholder_name": "Kwame"}
    try:
        fe.validate_transaction(payload)
        assert False, "expected ValidationError"
    except fe.ValidationError as exc:
        assert "amount" in str(exc)
        assert "ip_address" in str(exc)
        assert "country_code" in str(exc)


def test_validate_transaction_blank_cardholder_name():
    payload = {
        "cardholder_name": "   ",
        "amount": "10",
        "ip_address": "1.1.1.1",
        "country_code": "US",
    }
    try:
        fe.validate_transaction(payload)
        assert False, "expected ValidationError"
    except fe.ValidationError as exc:
        assert "cardholder_name" in str(exc)


def test_validate_transaction_non_numeric_amount():
    payload = {
        "cardholder_name": "Kofi",
        "amount": "not-a-number",
        "ip_address": "1.1.1.1",
        "country_code": "US",
    }
    try:
        fe.validate_transaction(payload)
        assert False, "expected ValidationError"
    except fe.ValidationError as exc:
        assert "amount" in str(exc)


def test_validate_transaction_negative_amount():
    payload = {
        "cardholder_name": "Kofi",
        "amount": "-50",
        "ip_address": "1.1.1.1",
        "country_code": "US",
    }
    try:
        fe.validate_transaction(payload)
        assert False, "expected ValidationError"
    except fe.ValidationError as exc:
        assert "non-negative" in str(exc)


def test_validate_transaction_malformed_country_code():
    payload = {
        "cardholder_name": "Kofi",
        "amount": "50",
        "ip_address": "1.1.1.1",
        "country_code": "USA",  # 3 letters, invalid
    }
    try:
        fe.validate_transaction(payload)
        assert False, "expected ValidationError"
    except fe.ValidationError as exc:
        assert "country_code" in str(exc)


def test_validate_transaction_malformed_ip():
    payload = {
        "cardholder_name": "Kofi",
        "amount": "50",
        "ip_address": "999.999.999.999",
        "country_code": "US",
    }
    try:
        fe.validate_transaction(payload)
        assert False, "expected ValidationError"
    except fe.ValidationError as exc:
        assert "ip_address" in str(exc)


def test_validate_transaction_ip_wrong_shape():
    payload = {
        "cardholder_name": "Kofi",
        "amount": "50",
        "ip_address": "not-an-ip",
        "country_code": "US",
    }
    try:
        fe.validate_transaction(payload)
        assert False, "expected ValidationError"
    except fe.ValidationError:
        pass


def test_validate_transaction_not_a_dict():
    try:
        fe.validate_transaction(["not", "a", "dict"])
        assert False, "expected ValidationError"
    except fe.ValidationError as exc:
        assert "JSON object" in str(exc)


# --------------------------------------------------------------------------
# score_transaction — boundaries + weights
# --------------------------------------------------------------------------

def _txn(amount="100", country="GH", ip="8.8.8.8"):
    return {
        "cardholder_name": "Test User",
        "amount": Decimal(amount),
        "country_code": country,
        "ip_address": ip,
    }


def test_score_low_risk_baseline():
    score, reasons = fe.score_transaction(_txn())
    assert score == 0
    assert reasons == []


def test_score_amount_exactly_at_threshold_triggers():
    # Boundary: amount == threshold must count as >= threshold
    txn = _txn(amount=str(fe.HIGH_AMOUNT_THRESHOLD))
    score, reasons = fe.score_transaction(txn)
    assert score == fe.WEIGHT_AMOUNT
    assert any("amount" in r for r in reasons)


def test_score_amount_just_below_threshold_does_not_trigger():
    below = fe.HIGH_AMOUNT_THRESHOLD - Decimal("0.01")
    txn = _txn(amount=str(below))
    score, _ = fe.score_transaction(txn)
    assert score == 0


def test_score_high_risk_country_triggers():
    txn = _txn(amount="1", country=next(iter(fe.HIGH_RISK_COUNTRIES)))
    score, reasons = fe.score_transaction(txn)
    assert score == fe.WEIGHT_COUNTRY
    assert any("high-risk" in r for r in reasons)


def test_score_private_ip_triggers_anomaly_weight():
    txn = _txn(amount="1", country="GH", ip="192.168.1.5")
    score, reasons = fe.score_transaction(txn)
    assert score == fe.WEIGHT_IP_ANOMALY
    assert any("ip_address" in r for r in reasons)


def test_score_caps_at_100_when_all_heuristics_stack():
    high_country = next(iter(fe.HIGH_RISK_COUNTRIES))
    txn = _txn(
        amount=str(fe.HIGH_AMOUNT_THRESHOLD * 10),
        country=high_country,
        ip="10.0.0.1",
    )
    score, reasons = fe.score_transaction(txn)
    total_weight = fe.WEIGHT_AMOUNT + fe.WEIGHT_COUNTRY + fe.WEIGHT_IP_ANOMALY
    assert total_weight > fe.MAX_SCORE  # sanity check the test is meaningful
    assert score == fe.MAX_SCORE
    assert len(reasons) == 3


def test_score_high_risk_flag_threshold():
    # Exactly at HIGH_RISK_SCORE_FLAG should be flagged (>=, not >)
    assert fe.WEIGHT_AMOUNT >= fe.HIGH_RISK_SCORE_FLAG
    txn = _txn(amount=str(fe.HIGH_AMOUNT_THRESHOLD))
    score, _ = fe.score_transaction(txn)
    assert score >= fe.HIGH_RISK_SCORE_FLAG


# --------------------------------------------------------------------------
# handler — batch isolation via ReportBatchItemFailures
# --------------------------------------------------------------------------

def _sqs_record(message_id, body_dict):
    return {"messageId": message_id, "body": json.dumps(body_dict)}


@patch("fraud_evaluator.sns")
@patch("fraud_evaluator.dynamodb")
def test_handler_isolates_bad_record_from_good_records(mock_dynamodb, mock_sns):
    mock_table = MagicMock()
    mock_dynamodb.Table.return_value = mock_table

    good_record = _sqs_record(
        "good-1",
        {
            "cardholder_name": "Ama",
            "amount": "10",
            "ip_address": "8.8.8.8",
            "country_code": "GH",
        },
    )
    bad_record = _sqs_record("bad-1", {"cardholder_name": "Incomplete"})  # missing fields

    event = {"Records": [good_record, bad_record]}

    with patch.dict(os.environ, {"AUDIT_TABLE_NAME": "test-table", "ALERT_TOPIC_ARN": "arn:test"}):
        fe.TABLE_NAME = "test-table"
        fe.TOPIC_ARN = "arn:test"
        result = fe.handler(event, None)

    assert result["batchItemFailures"] == [{"itemIdentifier": "bad-1"}]
    mock_table.put_item.assert_called_once()  # only the good record was written


@patch("fraud_evaluator.sns")
@patch("fraud_evaluator.dynamodb")
def test_handler_malformed_json_body_fails_only_that_record(mock_dynamodb, mock_sns):
    mock_table = MagicMock()
    mock_dynamodb.Table.return_value = mock_table

    good_record = _sqs_record(
        "good-2",
        {
            "cardholder_name": "Kojo",
            "amount": "20",
            "ip_address": "1.1.1.1",
            "country_code": "GH",
        },
    )
    malformed_record = {"messageId": "bad-2", "body": "{not valid json"}

    event = {"Records": [malformed_record, good_record]}

    fe.TABLE_NAME = "test-table"
    fe.TOPIC_ARN = "arn:test"
    result = fe.handler(event, None)

    assert result["batchItemFailures"] == [{"itemIdentifier": "bad-2"}]
    mock_table.put_item.assert_called_once()


@patch("fraud_evaluator.sns")
@patch("fraud_evaluator.dynamodb")
def test_handler_publishes_alert_only_for_high_risk(mock_dynamodb, mock_sns):
    mock_table = MagicMock()
    mock_dynamodb.Table.return_value = mock_table

    high_country = next(iter(fe.HIGH_RISK_COUNTRIES))
    high_risk_record = _sqs_record(
        "high-1",
        {
            "cardholder_name": "Risky Person",
            "amount": str(fe.HIGH_AMOUNT_THRESHOLD),
            "ip_address": "8.8.8.8",
            "country_code": high_country,
        },
    )
    low_risk_record = _sqs_record(
        "low-1",
        {
            "cardholder_name": "Safe Person",
            "amount": "5",
            "ip_address": "8.8.8.8",
            "country_code": "GH",
        },
    )

    event = {"Records": [high_risk_record, low_risk_record]}

    fe.TABLE_NAME = "test-table"
    fe.TOPIC_ARN = "arn:test"
    result = fe.handler(event, None)

    assert result["batchItemFailures"] == []
    assert mock_table.put_item.call_count == 2
    mock_sns.publish.assert_called_once()  # only the high-risk txn triggers SNS


@patch("fraud_evaluator.sns")
@patch("fraud_evaluator.dynamodb")
def test_handler_all_records_fail_reports_all(mock_dynamodb, mock_sns):
    mock_table = MagicMock()
    mock_dynamodb.Table.return_value = mock_table

    event = {
        "Records": [
            {"messageId": "bad-a", "body": "not json"},
            {"messageId": "bad-b", "body": json.dumps({"cardholder_name": "x"})},
        ]
    }

    fe.TABLE_NAME = "test-table"
    fe.TOPIC_ARN = "arn:test"
    result = fe.handler(event, None)

    failed_ids = {f["itemIdentifier"] for f in result["batchItemFailures"]}
    assert failed_ids == {"bad-a", "bad-b"}
    mock_table.put_item.assert_not_called()
