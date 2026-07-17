# ⚡ lambda/ - Fraud Evaluation Engine

![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python&logoColor=white)
![AWS Lambda](https://img.shields.io/badge/AWS_Lambda-%23FF9900.svg?style=for-the-badge&logo=aws-lambda&logoColor=white)
![pytest](https://img.shields.io/badge/Test-Pytest-blue?style=for-the-badge&logo=pytest)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ⚡ Fraud Evaluation Lambda Function

The core processing engine of the SentryNode Fraud Engine. This AWS Lambda function processes financial transactions in real-time, applying heuristic-based risk scoring to detect potentially fraudulent activity.

### 📦 What's Included

- **`fraud_evaluator.py`** - Main Lambda handler containing:
  - Transaction payload validation
  - Heuristic-based fraud scoring engine
  - DynamoDB audit logging
  - SNS alert publishing for high-risk transactions
  - Batch processing with isolated error handling

- **`tests/test_fraud_evaluator.py`** - Comprehensive test suite covering:
  - Input validation (missing/malformed fields)
  - Scoring boundary conditions
  - Score capping behavior
  - Batch item failure isolation
  - Edge case handling

- **`requirements.txt`** - Python dependencies:
  - `boto3>=1.34.0` - AWS SDK for Python (matches Lambda runtime version)

### 🛠️ Local Development Setup

#### Prerequisites
- Python 3.12+
- [pip](https://pip.pypa.io/en/stable/)
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate permissions
- AWS credentials with permissions to:
  - DynamoDB: PutItem (for local testing with actual AWS)
  - SNS: Publish (for local testing with actual AWS)
  - Or use [AWS LocalStack](https://localstack.cloud/) for full local simulation

#### Setup Commands
```bash
cd lambda

# Install dependencies
pip install -r requirements.txt pytest --break-system-packages

# Set required environment variable for local boto3 client creation
export AWS_DEFAULT_REGION=us-east-1

# Run test suite
python -m pytest tests/ -v

# Generate coverage report (optional)
python -m pytest tests/ --cov=fraud_evaluator --cov-report=term-missing
```

#### Testing with Real AWS Resources
To test against actual AWS resources (useful for integration testing):
```bash
# Ensure you have AWS credentials configured
aws sts get-caller-identity  # Verify credentials

# Run tests - they will use real AWS resources if configured
AWS_ACCESS_KEY_ID=your_key AWS_SECRET_ACCESS_KEY=your_secret \
AWS_DEFAULT_REGION=us-east-1 python -m pytest tests/ -v
```

#### Testing with LocalStack (Recommended for CI/CD)
```bash
# Start LocalStack (using Docker)
docker run -d -p 4566:4566 -p 4571:4571 \
  -e SERVICES=dynamodb,sns,sqs \
  -e DEBUG=1 \
  -e DATA_DIR=/tmp/localstack/data \
  localstack/localstack

# Set endpoint URLs
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export ENDPOINT_URL=http://localhost:4566

# Run tests against LocalStack
python -m pytest tests/ -v
```

#### Testing with SAM Local
Validate your function against the deployed infrastructure using SAM:
```bash
# From the infra/ directory
cd ../infra

# Invoke with sample event
sam local invoke FraudEvaluatorFunction --event events/sample-sqs-event.json

# Invoke with custom event
sam local invoke FraudEvaluatorFunction -e events/custom-event.json

# Start local API for testing
sam local start-api
```

### 🧠 Fraud Detection Logic (Logic: Phase 1 Heuristic Scorer

The current implementation uses a deterministic, rule-based scoring system designed to demonstrate the end-to-end pipeline. While not suitable for production fraud detection on its own, it provides a transparent, auditable foundation.

#### 📊 Scoring Algorithm

| Heuristic | Points | Threshold | Rationale |
|-----------|--------|-----------|-----------|
| **High Amount** | +60 | `amount >= 10,000` | Large transactions represent greater financial exposure and are statistically more likely to be fraudulent |
| **High-Risk Geography** | +30 | `country_code ∈ {KP, IR, SY, CU}` | Countries under international sanctions or with high fraud incidence |
| **Suspicious IP** | +15 | `ip_address ∈ private/ranges` | Transactions originating from non-routable IP ranges suggest spoofing or obfuscation |

#### 🎯 Risk Thresholds
- **Score ≥ 50**: Flagged as **HIGH RISK** → Triggers SNS alert
- **Score < 50**: **LOW RISK** → Logged only
- **Score Cap**: Maximum score is 100 (prevents runaway scoring)

#### 📈 Score Examples
| Transaction | Amount | Country | IP Address | Score | Risk Level |
|-------------|--------|---------|------------|-------|------------|
| Normal Purchase | $50.00 | US | 8.8.8.8 | 0 | Low |
| Large Domestic | $15,000.00 | US | 8.8.8.8 | 60 | High |
| International Small | $100.00 | KP | 8.8.8.8 | 30 | Low |
| Suspicious IP | $500.00 | US | 192.168.1.100 | 15 | Low |
| Combined Risk | $15,000.00 | KP | 10.0.0.5 | 105 → 100 | High (capped) |

#### ⚡ Performance Characteristics
- **Time Complexity**: O(1) per transaction - constant time evaluation
- **Space Complexity**: O(1) - fixed memory footprint
- **Throughput Limited By**: SQS batch processing and Lambda concurrency
- **Deterministic**: Identical inputs always produce identical outputs

### 🔄 Batch Processing & Error Handling

The Lambda is designed to process SQS batches of up to 10 messages with **isolated error handling**:

```mermaid
graph TD
    A[SQS Batch<br>Max 10 Messages] --> B[Lambda Invocation]
    B --> C{Process Each Record}
    C -->|Success| D[Process Normally]
    C -->|Validation Error| E[Return Message
   
       ] --> F[Validation/Processing Error]]| G[Return messageId<br>in BatchItemFailures]
    D --> H[Write to DynamoDB]
    H --> I{Score >= 50?}
    I -->|Yes| J[Publish to SNS]
    I -->|No| K[End Processing]
    F[Batch Complete] --> G
    G --> H
    H --> L[Return Successful<br>+ Failed MessageIds]
```

#### 🔑 Key Features
- **Atomic Processing**: Each record handled independently
- **Failure Isolation**: One bad record doesn't block good ones in same batch
- **Partial Success Reporting**: Returns only failed `messageIds` for SQS retry/DLQ
- **Idempotent Operations**: DynamoDB `PutItem` is upsert by `transaction_id`
- **Exactly-Once Semantics**: Achieved through idempotent operations + SQS deduplication

### 🔒 Security Implementation

#### IAM Permissions (Least Privilege)
The Lambda execution role is granted **only** these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/sentrynode-audit-log"
    },
    {
      "Effect": "Allow",
      "Action": ["sns:Publish"],
      "Resource": "arn:aws:sns:REGION:ACCOUNT_ID:AlertTopic"
    }
  ]
}
```

#### Runtime Protections
- **Input Validation**: All client-supplied data validated before processing
- **No External Calls**: Zero network dependencies beyond AWS SDK calls
- **No Serialization Vulnerabilities**: Uses native JSON parsing, no `eval()` or `pickle`
- **Error Containment**: All processing wrapped in try/catch blocks
- **No Hardcoded Secrets**: Zero credentials in codebase

### 📈 Performance & Optimization

#### Cold Start Optimization
- **Minimal Dependencies**: Only `boto3` required
- **Lazy Initialization**: AWS clients created outside handler for reuse
- **Compact Deployment**: <5MB zipped deployment package

#### Runtime Characteristics
- **Average Duration**: 50-150ms per batch (depends on DynamoDB/SNS latency)
- **Memory Usage**: ~128MB baseline configuration
- **Concurrency**: Automatically scales with SQS throughput
- **Throttling**: Respects SQS visibility timeout and batch windows

#### Monitoring & Observability
- **Structured Logging**: JSON-formatted logs for easy parsing
- **Custom Metrics**: Potential for CloudWatch custom metrics extension
- **Trace Integration**: AWS X-Ray ready for distributed tracing
- **Dead Letter Visibility**: SQS DLQ provides inspection of repeatedly failing messages

### 🔮 Evolution Path to Production ML System

While the current heuristic scorer demonstrates the architecture, a production fraud system would evolve through these stages:

#### Phase 1 → 2: Enriched Heuristics
- Replace static country list with dynamic sanctions/PEP feeds
- Implement IP reputation scoring via threat intelligence APIs
- Add basic velocity checks using DynamoDB counters
- Introduce time-based rules (velocity, velocity acceleration)

#### Phase 2 → 3: Supervised Learning
- Collect labeled outcomes (fraud/legit) from analyst feedback
- Extract features: amount, velocity, geography, device, behavioral
- Train baseline models: Logistic Regression, Random Forest
- Implement A/B testing framework for model comparison

#### Phase 3 → 4: Advanced ML Pipeline
- Feature store implementation (Feast, AWS SageMaker Feature Store)
- Real-time feature computation (Amazon Kinesis, Lambda)
- Model monitoring and drift detection
- Automated retraining pipeline
- Ensemble methods and model explainability (SHAP values)

### 📚 Resources & References

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Python Lambda Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html)
- [Effective Python for AWS Lambda](https://awslabs.github.io/aws-lambda-powertools-python/latest/)
- [Fraud Detection Techniques](https://www.cloudacademy.com/blog/fraud-detection-machine-learning/)
- [AWS Fraud Detection Solutions](https://aws.amazon.com/solutions/fraud-detection/)

### 🤝 Contributing

Please follow the [Contributing Guidelines](../../CONTRIBUTING.md) when making changes to this component. Pay special attention to:

1. **The Shared Contract Rule**: Any changes to transaction payload shape must be coordinated with `infra/` and `frontend/`
2. **Test Coverage**: Maintain or improve existing test coverage (≥80%)
3. **Security Review**: All changes involving validation or AWS service interaction
4. **Backwards Compatibility**: Consider impact on existing transactions in DynamoDB

---

<div align="center">
  <sub>Built with ⚡ for real-time fraud detection</sub> <br>
  <sup>Powered by Python, AWS Lambda, and rigorous testing</sup>
</div>