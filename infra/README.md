# `infra/` — Build Guide

> **Status:** 🚧 This folder needs to be rebuilt from scratch.
> This README is the spec — read it fully before writing any CloudFormation/SAM.

This folder owns every AWS resource SentryNode runs on: the ingestion API,
the queue, the audit store, the alert topic, and the IAM that wires them
together. Nothing here calls out to a database or service that isn't
provisioned in this folder.

---

## 1. What you're building

A single SAM/CloudFormation template (`template.yaml`) that provisions:

| Resource | Purpose |
|---|---|
| **API Gateway (HTTP API)** | Accepts `POST /transaction` from the frontend and forwards it straight into SQS. |
| **SQS ingestion queue + DLQ** | Durable buffer between the API and the Lambda. Failed messages land in the DLQ instead of retrying forever. |
| **Lambda (fraud evaluator)** | Consumes the queue in batches. Code lives in `../lambda/` — this template just wires its trigger, env vars, and IAM role. |
| **DynamoDB audit table** | One row per evaluated transaction. |
| **SNS alert topic** | Fan-out point for high-risk alerts (email today, chat/SMS later). |

Read [`../docs/architecture.md`](../docs/architecture.md) for the full data
flow diagram before you start — it explains *why* each hop exists, not just
what it is. Read [`../docs/decisions.md`](../docs/decisions.md) for the
reasoning behind API Gateway→SQS direct integration and DynamoDB-over-RDS;
don't relitigate those in a PR without reading the counterargument that's
already logged there.

---

## 2. Required behavior

Build the template to satisfy every point below. Treat this as acceptance
criteria, not suggestions.

### API Gateway → SQS
- Use an `AWS_PROXY` / `SQS-SendMessage` integration — **no Lambda in the
  ingestion hot path.** The client's POST should return as soon as the
  message is durably queued, not after the fraud evaluator runs.
- Give API Gateway a dedicated IAM role (e.g. `ApiGatewaySqsRole`) scoped
  to `sqs:SendMessage` on **only** the ingestion queue. No broader access.
- CORS locked to a **single explicit origin**, supplied via a template
  parameter (e.g. `AllowedOrigin`). No `*` wildcard, anywhere.

### SQS + DLQ
- `maxReceiveCount: 3` on the redrive policy. A message that fails
  validation or processing three times moves to the DLQ automatically —
  it must not retry forever or get silently dropped.

### Lambda trigger
- Event source: the ingestion queue, batch size `10`.
- Enable `ReportBatchItemFailures` (`FunctionResponseTypes: ReportBatchItemFailures`)
  so one malformed record in a batch doesn't block or drop the healthy
  records alongside it. This only works if the handler in `../lambda/`
  actually returns partial failures — that's the Lambda team's job, but
  the trigger config here is what makes it possible.
- `CodeUri: ../lambda/`, `Handler: fraud_evaluator.handler`,
  `Runtime: python3.12`. **Keep the handler name in sync** with whatever
  the lambda folder ships — this is a contract, not a default.

### DynamoDB
- Billing mode `PAY_PER_REQUEST`. No manually provisioned capacity — see
  `docs/decisions.md` for why (no capacity planning needed at MVP
  traffic, avoids guessing RCU/WCU up front).
- Partition key: `transaction_id`.

### SNS
- One topic, one email subscription wired via an `AlertEmail` parameter.
  Don't hardcode an email address into the template.
- Grant the Lambda's execution role `sns:Publish` on **only** this topic.

### IAM (applies everywhere in this template)
- Every policy statement names **specific actions and specific resources**.
  No `"Action": "*"`, no `"Resource": "*"`, no `AdministratorAccess`,
  ever — including in scratch/debug versions you don't intend to keep.
- No hardcoded credentials anywhere. All AWS access is via role
  assumption.

### Cost control
- CloudWatch log retention capped via a `LogRetentionDays` parameter
  (default `3`). CloudFormation's own default is "never expire" — don't
  leave it there.

---

## 3. Required parameters & outputs

The template must accept:

| Parameter | Purpose |
|---|---|
| `AlertEmail` | Email address for the SNS subscription. |
| `AllowedOrigin` | The single CORS origin allowed to call the ingestion API. |
| `LogRetentionDays` | CloudWatch log retention, default `3`. |

The template must export:

| Output | Consumed by |
|---|---|
| `IngestionApiUrl` | `frontend/.env.local` → `NEXT_PUBLIC_INGESTION_API_URL` |
| `AuditTableName` | Reference for anyone building the future read API |
| `AlertTopicArn` | Reference for anyone adding a chat/SMS subscriber later |

These names aren't arbitrary — the other folders' READMEs and `.env.example`
files already refer to them by these exact names.

---

## 4. Local setup & validation

You'll need the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
and an AWS account (Free Tier covers everything here).

```bash
cd infra

# Validate the template is well-formed before deploying anything
sam validate --lint

# Or, without the SAM CLI installed, cfn-lint alone also validates it
pip install cfn-lint --break-system-packages
cfn-lint template.yaml

# Build and deploy — guided mode walks you through AlertEmail and
# AllowedOrigin interactively
sam build
sam deploy --guided
```

After deploy, **confirm the SNS email subscription** — check the inbox you
gave for `AlertEmail`. Alerts won't arrive until you click the confirmation
link AWS sends.

Once the Lambda in `../lambda/` exists, test it locally against a
realistic batch without a real queue:

```bash
sam local invoke FraudEvaluatorFunction --event events/sample-sqs-event.json
```

A sample event fixture (`events/sample-sqs-event.json`) — one clean
transaction, one high-risk transaction, one malformed record — should live
in this folder so the whole team tests against the same batch shape.

---

## 5. Free Tier budget

Every resource choice here should stay comfortably inside AWS Free Tier at
MVP-level traffic:

- **Lambda:** 1M free requests/month, 400,000 GB-seconds compute
- **API Gateway (HTTP API):** 1M free requests/month (first 12 months)
- **SQS:** 1M free requests/month
- **DynamoDB on-demand:** 25 GB storage + a generous free request allowance
- **SNS:** 1,000 free email notifications/month

If real traffic pushes past demo-level, re-check current Free Tier limits
before assuming these numbers still hold — they change over time.

---

## 6. Explicitly out of scope for Phase 1

Don't build these — they're deliberate cuts, not things you forgot. Full
reasoning in `docs/architecture.md`, "Out of scope."

- Authentication/authorization on the ingestion endpoint
- A read API for the audit table (`GET /transactions`)
- Multi-region / cross-region failover
- Idempotency or dedup on `transaction_id`

---

## 7. Contract with the other folders

- `CodeUri: ../lambda/` — this template zips whatever's in that folder.
  `Handler:` here must match the handler name the Lambda team ships.
- The three template outputs (§3) are the interface `frontend/` builds
  against. Don't rename them without updating `frontend/.env.example` and
  `frontend/lib/api.ts` in the same PR.
- See [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for the shared-contract
  rule: any change to the transaction payload shape or these output names
  must land across `infra/`, `lambda/`, and `frontend/` together.

---

## Definition of done

- [ ] `sam validate --lint` (or `cfn-lint`) passes clean
- [ ] `sam deploy --guided` succeeds and prints all three required outputs
- [ ] SNS email subscription confirmed and a manual high-risk test message
      actually arrives
- [ ] No IAM statement uses a wildcard action or resource
- [ ] CORS origin is the single value from `AllowedOrigin`, not `*`
- [ ] `sam local invoke` against `events/sample-sqs-event.json` runs once
      the Lambda exists
