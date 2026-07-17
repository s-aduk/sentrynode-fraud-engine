import os
import json
import pytest
from unittest.mock import patch, MagicMock

# Set up local mock environments before importing the handler
os.environ["AWS_ACCESS_KEY_ID"] = "testing"
os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
os.environ["AUDIT_TABLE_NAME"] = "test-audit-table"
os.environ["ALERT_TOPIC_ARN"] = "arn:aws:sns:us-east-1:123456789012:test-alert"

import fraud_evaluator


@pytest.mark.parametrize("invalid_payload", [
    # Missing required keys
    {"amount": "50.00", "ip_address": "8.8.8.8", "country_code": "US"},
    # Non-string properties
    {"cardholder_name": "Bob", "amount": 100.50, "ip_address": "8.8.8.8", "country_code": "US"},
    # Null string fields
    {"cardholder_name": "Bob", "amount": " ", "ip_address": "8.8.8.8", "country_code": "US"},
    # Malformed decimal amounts
    {"cardholder_name": "Bob", "amount": "abc", "ip_address": "8.8.8.8", "country_code": "US"},
    # Negative decimal amounts
    {"cardholder_name": "Bob", "amount": "-150.00", "ip_address": "8.8.8.8", "country_code": "US"}
])
def test_schema_contract_rejections(invalid_payload):
    with pytest.raises(ValueError):
        fraud_evaluator.validate_transaction(invalid_payload)


def test_validation_acceptance():
    valid = {
        "cardholder_name": "Jane Smith",
        "amount": "250.75",
        "ip_address": "172.56.21.9",
        "country_code": "GH"
    }
    fraud_evaluator.validate_transaction(valid)


def test_heuristic_risk_weight_resolutions():
    # Base low-risk case
    payload = {
        "cardholder_name": "Jane Smith",
        "amount": "100.00",
        "ip_address": "8.8.8.8",
        "country_code": "GH"
    }
    
    # 1. Trigger High Amount threshold (60 points)
    res = fraud_evaluator.evaluate_transaction(payload, 100.00, ["KP"], 50)
    assert res["risk_score"] == 60
    assert res["is_high_risk"] is True
    assert len(res["reasons"]) == 1
    
    # 2. Trigger High Risk Country Code (30 points)
    res = fraud_evaluator.evaluate_transaction(payload, 5000.00, ["GH"], 50)
    assert res["risk_score"] == 30
    assert res["is_high_risk"] is False
    
    # 3. Trigger Private IP Block (15 points)
    payload["ip_address"] = "192.168.1.50"
    res = fraud_evaluator.evaluate_transaction(payload, 5000.00, ["KP"], 50)
    assert res["risk_score"] == 15
    assert res["is_high_risk"] is False


def test_scoring_limit_capping():
    # Trigger all three: 60 + 30 + 15 = 105 points. Must cap at 100.
    payload = {
        "cardholder_name": "Sunder Pichai",
        "amount": "12000.00",
        "ip_address": "10.0.0.15",
        "country_code": "KP"
    }
    res = fraud_evaluator.evaluate_transaction(payload, 10000.00, ["KP"], 50)
    assert res["risk_score"] == 100
    assert len(res["reasons"]) == 3


@patch("fraud_evaluator.dynamodb")
@patch("fraud_evaluator.sns")
def test_isolated_batch_item_failure_reporting(mock_sns, mock_dynamodb):
    # Setup DynamoDB Mock Table Resource
    mock_table = MagicMock()
    mock_dynamodb.Table.return_value = mock_table
    
    # Batch Event: Msg 1 is valid, Msg 2 fails validation, Msg 3 triggers an SNS Alert
    event = {
        "Records": [
            {
                "messageId": "msg-001",
                "body": json.dumps({
                    "cardholder_name": "Low Risk Alice",
                    "amount": "12.50",
                    "ip_address": "8.8.8.8",
                    "country_code": "US"
                })
            },
            {
                "messageId": "msg-002",
                "body": json.dumps({
                    "cardholder_name": "Malformed Bob",
                    "amount": "NOT_A_NUMBER",
                    "ip_address": "8.8.8.8",
                    "country_code": "US"
                })
            },
            {
                "messageId": "msg-003",
                "body": json.dumps({
                    "cardholder_name": "High Risk Charlie",
                    "amount": "10500.00",
                    "ip_address": "127.0.0.1",
                    "country_code": "US"
                })
            }
        ]
    }
    
    response = fraud_evaluator.handler(event, None)
    
    # Ensure only the invalid message ID gets sent back for a retry
    assert response == {
        "batchItemFailures": [{"itemIdentifier": "msg-002"}]
    }
    
    # DynamoDB should only get written to twice (msg-001 and msg-003)
    assert mock_table.put_item.call_count == 2
    
    # SNS should publish exactly once (for msg-003)
    mock_sns.publish.assert_called_once()