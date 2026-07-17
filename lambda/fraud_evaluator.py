import os
import json
import uuid
import time
import logging
import boto3

# Initialize system logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Instantiated outside the handler scope to take advantage of AWS Lambda keep-alive execution environments
dynamodb = boto3.resource("dynamodb")
sns = boto3.client("sns")


def validate_transaction(payload: dict) -> None:
    """
    Validates input payloads according to the shared cross-team schema contract.
    Raises ValueError on validation failure.
    """
    if not isinstance(payload, dict):
        raise ValueError("Transaction payload must be a JSON object.")
        
    required_fields = ["cardholder_name", "amount", "ip_address", "country_code"]
    
    # Enforce field presence and format contracts
    for field in required_fields:
        if field not in payload:
            raise ValueError(f"Missing required contract field: '{field}'")
        if not isinstance(payload[field], str):
            raise ValueError(f"Contract field '{field}' must be a string.")
        if not payload[field].strip():
            raise ValueError(f"Contract field '{field}' cannot be empty.")
            
    # Amount numeric conversion validation
    try:
        amount_val = float(payload["amount"])
        if amount_val < 0:
            raise ValueError("Amount cannot be a negative value.")
    except (ValueError, TypeError):
        raise ValueError(
            f"Invalid transaction amount format: '{payload.get('amount')}'. "
            "Must be a non-negative decimal string."
        )


def evaluate_transaction(
    payload: dict,
    high_amount_threshold: float,
    high_risk_countries: list[str],
    high_risk_score_flag: int
) -> dict:
    """
    Computes a deterministic, explainable risk score (0-100) based on target heuristics.
    """
    # Fallback UUID generation if transaction_id is absent
    tx_id = payload.get("transaction_id")
    if not tx_id or not str(tx_id).strip():
        tx_id = str(uuid.uuid4())
        
    amount_val = float(payload["amount"])
    ip = payload["ip_address"].strip()
    country = payload["country_code"].strip().upper()
    
    risk_score = 0
    reasons = []
    
    # Heuristic 1: Large Amount Exposure (Weight: 60)
    if amount_val >= high_amount_threshold:
        risk_score += 60
        reasons.append(
            f"Transaction amount (${amount_val:,.2f}) meets or exceeds high-amount threshold of ${high_amount_threshold:,.2f}"
        )
        
    # Heuristic 2: Sanctioned Country Check (Weight: 30)
    if country in high_risk_countries:
        risk_score += 30
        reasons.append(
            f"Geographic flag: Cardholder registered country code '{country}' falls within configured high-risk list"
        )
        
    # Heuristic 3: Private/Non-Routable IP Block Check (Weight: 15)
    private_ip_prefixes = ("10.", "192.168.", "127.")
    if any(ip.startswith(prefix) for prefix in private_ip_prefixes):
        risk_score += 15
        reasons.append(
            f"Network anomaly: Source IP address '{ip}' resolves to a non-routable private IP block"
        )
        
    # Standard 0-100 capping logic
    capped_score = min(risk_score, 100)
    is_high_risk = capped_score >= high_risk_score_flag
    
    return {
        "transaction_id": tx_id,
        "cardholder_name": payload["cardholder_name"],
        "amount": payload["amount"],
        "ip_address": payload["ip_address"],
        "country_code": country,
        "risk_score": capped_score,
        "is_high_risk": is_high_risk,
        "reasons": reasons,
        "evaluated_at": int(time.time())
    }


def handler(event, context):
    """
    Core entry point mapped in template.yaml as fraud_evaluator.handler.
    Processes SQS batches while isolating failures to prevent whole-queue retry loops.
    """
    logger.info(f"Incoming batch size: {len(event.get('Records', []))} records.")
    batch_item_failures = []
    
    # Load dynamic, hot-swappable environment variables
    high_amount_threshold = float(os.environ.get("HIGH_AMOUNT_THRESHOLD", "10000.00"))
    high_risk_countries = [
        c.strip().upper() 
        for c in os.environ.get("HIGH_RISK_COUNTRIES", "KP,IR,SY,CU").split(",") 
        if c.strip()
    ]
    high_risk_score_flag = int(os.environ.get("HIGH_RISK_SCORE_FLAG", "50"))
    audit_table_name = os.environ.get("AUDIT_TABLE_NAME")
    alert_topic_arn = os.environ.get("ALERT_TOPIC_ARN")
    
    for record in event.get("Records", []):
        message_id = record.get("messageId")
        try:
            body_str = record.get("body", "{}")
            payload = json.loads(body_str)
            
            # 1. Input Contract Enforcement
            validate_transaction(payload)
            
            # 2. Risk Calculation Engine
            evaluated_record = evaluate_transaction(
                payload=payload,
                high_amount_threshold=high_amount_threshold,
                high_risk_countries=high_risk_countries,
                high_risk_score_flag=high_risk_score_flag
            )
            
            # 3. DynamoDB Audit Logging (PutItem writes)
            if audit_table_name:
                table = dynamodb.Table(audit_table_name)
                table.put_item(Item=evaluated_record)
            else:
                logger.warning("AUDIT_TABLE_NAME not set. DynamoDB logging omitted.")
                
            # 4. Selective SNS Alert Dispatch (Isolated to high risk)
            if evaluated_record["is_high_risk"]:
                if alert_topic_arn:
                    sns.publish(
                        TopicArn=alert_topic_arn,
                        Message=json.dumps(evaluated_record),
                        Subject="FRAUD ALERT: High Risk Transaction Detected"
                    )
                else:
                    logger.warning("ALERT_TOPIC_ARN not set. SNS notification omitted.")
                    
        except Exception as e:
            logger.error(f"Error processing record {message_id}: {str(e)}", exc_info=True)
            if message_id:
                # Appending the SQS message ID tells SQS to only retry this specific record.
                batch_item_failures.append({"itemIdentifier": message_id})
                
    return {"batchItemFailures": batch_item_failures}