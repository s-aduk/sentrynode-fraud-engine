# Architecture

## Data flow

```
                     ┌─────────────────────┐
                     │   Client (Next.js)  │
                     │  Transaction Emulator│
                     └──────────┬───────────┘
                                │ POST /transaction
                                │ (single explicit CORS origin)
                                ▼
                     ┌─────────────────────┐
                     │  API Gateway (HTTP) │
                     │  AWS_PROXY → SQS    │   <- no Lambda in the hot path
                     └──────────┬───────────┘
                                │ sqs:SendMessage
                                ▼
                     ┌─────────────────────┐        3 failed        ┌──────────────┐
                     │   SQS: Ingestion    │ ───── receives ──────► │   SQS: DLQ    │
                     │   Queue             │                        │ (manual review)│
                     └──────────┬───────────┘                        └──────────────┘
                                │ event source (batch size 10)
                                ▼
                     ┌─────────────────────────────┐
                     │ Lambda: fraud_evaluator.py   │
                     │  for each record (isolated): │
                     │   1. validate payload         │
                     │   2. score (heuristic rules)  │
                     │   3. write audit row          │
                     │   4. alert if high-risk        │
                     │  ReportBatchItemFailures:      │
                     │   bad records retry/DLQ alone  │
                     └───────┬───────────────┬───────┘
                             │                │
              dynamodb:PutItem│                │sns:Publish (high-risk only)
                             ▼                ▼
                  ┌─────────────────┐   ┌─────────────────┐
                  │ DynamoDB         │   │ SNS: Alert Topic │
                  │ sentrynode-audit-│   │ (fan-out ready)  │
                  │ log              │   └────────┬─────────┘
                  └─────────────────┘             │
                                                   ▼
                                          Email (Phase 1)
                                          Chat/SMS (future subscribers,
                                          no scorer changes needed)
```

## Component notes

- **API Gateway → SQS**: the integration uses `AWS_PROXY` /
  `SQS-SendMessage` with a scoped IAM role
  (`ApiGatewaySqsRole`) that can only `sqs:SendMessage` on the one
  ingestion queue. This keeps compute out of the synchronous request path —
  a transaction is durably queued the instant the client's POST returns.
- **SQS + DLQ**: `maxReceiveCount: 3`. A message that fails validation or
  processing 3 times moves to the DLQ automatically rather than retrying
  forever or being silently dropped.
- **Lambda (`fraud_evaluator.py`)**: processes each SQS record in the batch
  independently, inside its own try/except. It uses SQS's
  `ReportBatchItemFailures` feature — the handler returns only the
  `messageId`s that actually failed, so one corrupt record never blocks or
  drops the healthy records in the same batch.
- **DynamoDB**: an audit-only write target. Every evaluated transaction
  gets exactly one `PutItem` call, keyed by `transaction_id`.
- **SNS**: fan-out point for alerts. Phase 1 wires one email subscription;
  adding a chat webhook or SMS subscriber later requires zero changes to
  the Lambda's IAM policy or code, since it only needs `sns:Publish`.

## Out of scope for Phase 1 (deliberately)

These are scope cuts, not oversights. Each is called out so a reviewer
doesn't mistake an intentional MVP boundary for a gap:

- **Authentication and authorization.** Neither the ingestion endpoint nor
  (if built later) a read endpoint has any auth. Anyone with the URL can
  submit or, eventually, read transactions. A real deployment needs API
  keys or a proper auth layer (Cognito, IAM SigV4, or an API Gateway
  authorizer) before it touches real cardholder data.
- **Real velocity/behavioral checks.** The scorer has no state between
  transactions — no "5 transactions from this card in 10 minutes" logic.
  That needs a stateful, cardholder-keyed store (e.g. a DynamoDB GSI on
  cardholder + a sliding time window), which Phase 1 doesn't build.
- **ML-based scoring.** The scorer is deterministic and rule-based (see
  `lambda/README.md`). There's no labeled fraud/not-fraud dataset yet to
  train against, so building an ML pipeline now would be premature.
- **A read API for the audit table.** `infra/` only writes to DynamoDB.
  There's no `GET /transactions` route or backing Lambda. The frontend's
  Monitoring Feed reflects this honestly with a "Not connected" state
  rather than faking data.
- **Real IP reputation/geolocation.** The "IP anomaly" heuristic is a
  placeholder (flags private/non-routable address ranges) — a real
  implementation needs an actual IP intelligence feed.
- **Multi-region / DR.** Single-region deployment. SQS, DynamoDB, and
  Lambda are regionally resilient by default, but there's no cross-region
  failover story.
- **Idempotency / dedup on `transaction_id`.** A resubmitted ID overwrites
  the prior audit row rather than being rejected or merged.

## Why event-driven + serverless

Every piece of this stack (API Gateway HTTP API, SQS, Lambda, DynamoDB
on-demand, SNS) has a Free Tier allowance generous enough for MVP traffic,
and none of it requires provisioning always-on compute. See `infra/README.md`
for the specific Free Tier numbers behind each choice.
