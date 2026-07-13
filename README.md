# SentryNode Fraud Engine

A real-time, event-driven, serverless fraud detection MVP — built to run
entirely inside AWS Free Tier at MVP-level traffic.

A transaction posted from the frontend goes straight into an SQS queue via
API Gateway, gets picked up by a single Python Lambda that scores it with
a deterministic rule set, logs the result to DynamoDB, and — if it crosses
the risk threshold — publishes an alert to SNS. See `docs/architecture.md`
for the full data flow diagram and what's deliberately out of scope.

## Repo layout

```
infra/      SAM/CloudFormation stack — API Gateway, SQS, Lambda, DynamoDB, SNS
lambda/     Python fraud evaluator + unit tests
frontend/   Next.js console — Transaction Emulator + Monitoring Feed
docs/       Architecture notes + decisions log
.github/    CI workflow, PR template, issue templates
```

Each folder has its own `README.md` with local setup commands, that
folder's specific known gaps, and how it depends on the others. Start
there for anything folder-specific.

- [`infra/README.md`](infra/README.md)
- [`lambda/README.md`](lambda/README.md)
- [`frontend/README.md`](frontend/README.md)

## Quick start

1. **Deploy the backend** (see `infra/README.md` for full detail):
   ```bash
   cd infra
   sam build
   sam deploy --guided
   ```
   Confirm the SNS email subscription in your inbox after deploy — alerts
   won't arrive until you do.

2. **Run the Lambda's tests:**
   ```bash
   cd lambda
   pip install -r requirements.txt pytest --break-system-packages
   AWS_DEFAULT_REGION=us-east-1 python -m pytest tests/ -v
   ```

3. **Run the frontend:**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local   # fill in IngestionApiUrl from step 1's output
   npm run dev
   ```

4. Open the **Transaction Emulator** and send a test transaction. Check
   your alert email for anything scoring 50+, and check the DynamoDB
   console (`sentrynode-audit-log` table) for every logged transaction —
   the in-app **Monitoring Feed** shows an honest "not connected" state
   until a read API exists (see Known gaps below).

## Known gaps (repo-wide)

- **No read API for the audit table** — the Monitoring Feed has nothing to
  call yet. See `docs/architecture.md`, "out of scope."
- **No authentication** anywhere in the stack. Fine for an MVP demo, not
  for production use with real cardholder data.
- **Rule-based scoring, not ML** — see `lambda/README.md` for the upgrade
  path once labeled data exists.
- **DynamoDB, not RDS, for the audit store** — a deliberate call, logged
  with the counterargument in `docs/decisions.md`.

## Security posture

- Every IAM policy in this repo names specific actions and specific
  resources — no wildcards, no `AdministratorAccess`.
- CORS is locked to a single explicit origin, set via a deploy parameter.
- No hardcoded credentials anywhere; all AWS access is via IAM role
  assumption.
- CloudWatch log retention is capped (3 days by default) for cost control.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch naming, the PR process,
and — importantly — the rule that any change to the shared transaction
payload shape must update `infra/`, `lambda/`, and `frontend/` together.
