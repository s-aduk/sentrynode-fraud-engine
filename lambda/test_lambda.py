import os

os.environ["AWS_DEFAULT_REGION"] = "us-east-1"

import json
from fraud_evaluator import handler


with open("test_event.json") as file:
    event = json.load(file)


response = handler(event, None)

print(response)