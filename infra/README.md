# 🏗️ infra/ - AWS Infrastructure

![AWS CloudFormation](https://img.shields.io/badge/AWS_CloudFormation-%2313294D.svg?style=for-the-badge&logo=amazon-aws&logoColor=white
![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)

## 🏗️ AWS SAM/CloudFormation Infrastructure

This directory contains the infrastructure-as-code definitions for the SentryNode Fraud Engine, deploying a complete serverless fraud detection pipeline on AWS.

### 📦 What's Included

- **`template.yaml`** - Complete SAM template defining:
  - Amazon API Gateway (HTTP API) with direct SQS integration
  - Amazon SQS Standard Queue with Dead Letter Queue (DLQ)
  - AWS Lambda Function (Python 3.12) for fraud evaluation
  - Amazon DynamoDB Table (PAY_PER_REQUEST) for audit logging
  - Amazon SNS Topic for fraud alert notifications
  - IAM Roles and Policies following principle of least privilege
  - CloudWatch Log Groups with retention policies

- **`events/sample-sqs-event.json`** - Realistic test event containing:
  - One clean transaction (low risk)
  - One high-risk transaction (triggers alert)
  - One malformed record (tests error handling)

### 🛠️ Local Development Setup

#### Prerequisites
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate permissions
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) 
- Python 3.12+ (for cfn-lint if not using SAM CLI)
- An AWS account (Free Tier sufficient for development & testing)

#### Setup Commands
```bash
cd infra

# Validate CloudFormation template syntax
sam validate --lint              # Using SAM CLI (recommended)
# OR
pip install cfn-lint --break-system-packages
cfn-lint template.yaml           # Using cfn-lint directly

# Build application dependencies
sam build

# Deploy to AWS (guided mode prompts for parameters)
sam deploy --guided
```

#### Deployment Parameters
During `sam deploy --guided`, you'll be prompted for:
- **Stack Name**: Logical name for the CloudFormation stack (default: `sentrynode-fraud-engine`)
- **AWS Region**: Deployment region (default: `us-east-1`)
- **AlertEmail**: Email address to receive SNS fraud alerts (required)
- **AllowedOrigin**: CORS origin for frontend access (e.g., `http://localhost:3000`)

> 💡 **Pro Tip**: Use a dedicated email alias for alerts during development to keep your primary inbox clean.

#### Post-Deployment Steps
1. **Check your email** for the SNS subscription confirmation from AWS
2. **Click the confirmation link** - alerts will NOT be delivered until confirmed
3. **Retrieve outputs** from the deployment:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name sentrynode-fraud-engine \
     --query 'Stacks[0].Outputs'
   ```
4. **Copy `IngestionApiUrl`** to `frontend/.env.local` as:
   ```
   NEXT_PUBLIC_INGESTION_API_URL=<your-api-gateway-url>
   ```

#### Local Lambda Testing
Test the fraud evaluator function locally with sample events:
```bash
# Using the provided sample event
sam local invoke FraudEvaluatorFunction --event events/sample-sqs-event.json

# Or create custom test events:
sam local invoke FraudEvaluatorFunction -e events/custom-event.json
```

### 🏗️ Architecture Decisions

#### ✅ API Gateway → SQS Direct Integration
- **Pattern**: `AWS_PROXY` / `SQS-SendMessage` integration
- **Benefit**: Zero-latency ingestion - API Gateway writes directly to SQS
- **Security**: `ApiGatewaySqsRole` restricted to `sqs:SendMessage` on specific queue only
- **Scalability**: Inherits SQS scalability without Lambda warm-up delays

#### ✅ SQS with Dead Letter Queue
- **Configuration**: `maxReceiveCount: 3`
- **Behavior**: Messages failing 3 times move to DLQ for manual inspection
- **Advantage**: Prevents poison pill messages from blocking queue processing
- **Operations**: DLQ enables targeted debugging without affecting healthy traffic

#### ✅ DynamoDB ON_DEMAND Billing
- **Selection**: `PAY_PER_REQUEST` billing mode
- **Benefit**: No capacity planning required for variable traffic patterns
- **Cost**: Pay only for actual reads/writes (ideal for spiky MVP traffic)
- **Scaling**: Automatic scaling handles traffic bursts seamlessly

#### ✅ Controlled CloudWatch Log Retention
- **Parameter**: `LogRetentionDays` (default: 3 days)
- **Purpose**: Explicit cost control vs. default "never expire" behavior
- **Compliance**: Meets data retention policies while controlling costs
- **Adjustment**: Increase for production audit requirements

#### ✅ Strict CORS Configuration
- **Implementation**: Single explicit origin via `AllowedOrigin` parameter
- **Security**: No wildcard origins - prevents unauthorized cross-origin requests
- **Flexibility**: Update via stack update when frontend deployment domains change

### 💰 Free Tier Optimization

All services selected to maximize AWS Free Tier benefits at MVP-level traffic:

| Service | Free Tier Allocation | Usage Pattern |
|---------|---------------------|---------------|
| **Lambda** | 1M requests/month, 400,000 GB-sec | Bursty transaction processing |
| **API Gateway** | 1M requests/month (HTTP API) | Ingestion endpoint only |
| **SQS** | 1M requests/month | Buffer between API and Lambda |
| **DynamoDB** | 25GB storage + 25 WCU / 25 RCU | Audit log storage |
| **SNS** | 1,000 email notifications/month | Fraud alert delivery |

> ⚠️ **Note**: Monitor usage via AWS Budgets if approaching production scale - Free Tier benefits change periodically.

### 🔒 Security Posture

- **Least Privilege IAM**: Each service role has only permissions it needs
- **No Wildcard Resources**: All ARNs are specific to created resources
- **No Hardcoded Secrets**: Zero credentials in code or templates
- **Parameterized Configuration**: Sensitive values passed at deployment time
- **Audit Logging**: All transactions immutably recorded in DynamoDB

### 🔄 Dependencies

#### Internal Dependencies
- **`lambda/`**: Contains the `fraud_evaluator.py` function code
  - SAM `CodeUri` points to `../lambda/`
  - Handler must match `fraud_evaluator.handler`

#### External Dependencies
- **AWS Services**: API Gateway, SQS, Lambda, DynamoDB, SNS, CloudWatch, IAM
- **AWS SAM CLI**: For local development and deployment
- **AWS CLI**: For stack management and output retrieval

### 🐛 Known Limitations

- **Single Region Deployment**: No cross-region replication for disaster recovery
- **No Read API**: No endpoint to retrieve audit records (intentional for Phase 1)
- **No Authentication**: Ingestion endpoint is publicly accessible (MVP limitation)
- **Fixed Regions**: All resources deployed to single specified region

### 🚀 Future Enhancements

1. **Add Read API**: `GET /transactions` endpoint with pagination/filtering
2. **Implement Authentication**: API Gateway authorizer or Cognito integration
3. **Multi-Region Deployment**: Cross-region replication for disaster recovery
4. **Enhanced Monitoring**: CloudWatch dashboards and alarms
5. **Tagging Strategy**: Resource allocation tagging for cost accounting

### 📚 Additional Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [SAM CLI Installation Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [AWS Free Tier Details](https://aws.amazon.com/free/)
- [SQS Dead Letter Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [DynamoDB On-Demand Capacity](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html#HowItWorks.OnDemand)