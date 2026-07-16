import json
import os
import uuid
import boto3
from datetime import datetime, timezone


# AWS clients

dynamodb = boto3.resource("dynamodb")
sns_client = boto3.client("sns")


# Fraud scoring configuration

HIGH_AMOUNT_THRESHOLD = 10000

HIGH_RISK_COUNTRIES = [
    "KP",
    "IR",
    "SY",
    "CU"
]

HIGH_AMOUNT_WEIGHT = 40
HIGH_RISK_COUNTRY_WEIGHT = 40
UNUSUAL_IP_WEIGHT = 20

ALERT_THRESHOLD = 50


# Environment variables

AUDIT_TABLE = os.environ.get(
    "AUDIT_TABLE",
    "sentrynode-audit-log"
)

ALERT_TOPIC = os.environ.get(
    "ALERT_TOPIC",
    ""
)



def validate_transaction(transaction):
    """
    Validate incoming transaction payload.
    """

    required_fields = [
        "cardholder_name",
        "amount",
        "ip_address",
        "country_code"
    ]


    for field in required_fields:

        if field not in transaction:
            raise ValueError(
                f"Missing required field: {field}"
            )


    if not isinstance(
        transaction["amount"],
        (int, float)
    ):
        raise ValueError(
            "Amount must be numeric"
        )


    if transaction["amount"] <= 0:
        raise ValueError(
            "Amount must be greater than zero"
        )


    if len(transaction["country_code"]) != 2:
        raise ValueError(
            "Country code must be two characters"
        )


    return True




def calculate_risk_score(transaction):
    """
    Calculate fraud risk score.
    """

    score = 0
    reasons = []


    if transaction["amount"] >= HIGH_AMOUNT_THRESHOLD:

        score += HIGH_AMOUNT_WEIGHT

        reasons.append(
            "High transaction amount"
        )


    if transaction["country_code"].upper() in HIGH_RISK_COUNTRIES:

        score += HIGH_RISK_COUNTRY_WEIGHT

        reasons.append(
            "High risk country"
        )


    return {
        "score": score,
        "reasons": reasons,
        "is_fraud": score >= ALERT_THRESHOLD
    }




def save_audit_record(transaction, risk_result):
    """
    Save evaluated transaction to DynamoDB.
    """

    table = dynamodb.Table(
        AUDIT_TABLE
    )


    item = {

        "transaction_id": str(
            uuid.uuid4()
        ),

        "cardholder_name": transaction[
            "cardholder_name"
        ],

        "amount": transaction[
            "amount"
        ],

        "ip_address": transaction[
            "ip_address"
        ],

        "country_code": transaction[
            "country_code"
        ],

        "risk_score": risk_result[
            "score"
        ],

        "fraud_detected": risk_result[
            "is_fraud"
        ],

        "reasons": risk_result[
            "reasons"
        ],

        "timestamp": datetime.now(
            timezone.utc
        ).isoformat()

    }


    table.put_item(
        Item=item
    )


    print(
        "Audit record saved:"
    )

    print(item)


    return item




def send_fraud_alert(transaction, risk_result):
    """
    Send SNS notification for suspicious transactions.
    """


    if not risk_result["is_fraud"]:
        return



    alert_message = {

        "alert": "Suspicious transaction detected",

        "cardholder_name": transaction[
            "cardholder_name"
        ],

        "amount": transaction[
            "amount"
        ],

        "country_code": transaction[
            "country_code"
        ],

        "risk_score": risk_result[
            "score"
        ],

        "reasons": risk_result[
            "reasons"
        ],

        "timestamp": datetime.now(
            timezone.utc
        ).isoformat()

    }



    sns_client.publish(

        TopicArn=ALERT_TOPIC,

        Subject="SentryNode Fraud Alert",

        Message=json.dumps(
            alert_message,
            indent=2
        )

    )


    print(
        "Fraud alert sent:"
    )

    print(alert_message)




def handler(event, context):
    """
    Lambda entry point.
    Processes SQS batch events.
    """


    batch_failures = []


    for record in event.get(
        "Records",
        []
    ):


        try:

            transaction = json.loads(
                record["body"]
            )


            print(
                "Processing transaction:"
            )

            print(transaction)



            validate_transaction(
                transaction
            )



            risk_result = calculate_risk_score(
                transaction
            )


            print(
                "Risk result:"
            )

            print(risk_result)



            save_audit_record(
                transaction,
                risk_result
            )



            send_fraud_alert(
                transaction,
                risk_result
            )



        except Exception as error:

            print(
                f"Failed processing record: {error}"
            )


            batch_failures.append(
                {
                    "itemIdentifier": record[
                        "messageId"
                    ]
                }
            )



    return {

        "batchItemFailures": batch_failures

    }