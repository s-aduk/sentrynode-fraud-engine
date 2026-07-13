# `lambda/` — Build Guide

> **Status:** 🚧 This folder needs to be rebuilt from scratch.
> This README is the spec — read it fully before writing `fraud_evaluator.py`.

This folder is the processing core: one Python Lambda triggered by the SQS
ingestion queue, which validates each transaction, scores it, writes an
audit row, and alerts on anything high-risk.

Read [`../docs/architecture.md`](../docs/architecture.md) first — it
explains how this Lambda fits between SQS and DynamoDB/SNS, and why
per-record batch isolation matters here specifically.

---

## 1. What you're building

| File | Purpose |
|---|---|
| `fraud_evaluator.py` | Handler, payload validation, and the scoring logic. |
| `tests/test_fraud_evaluator.py` | Unit tests — validation, scoring boundaries, score capping, batch isolation. |
| `requirements.txt` | Runtime deps (`boto3` — already present in the Lambda execution environment, but pin it here for local dev parity). |

**Runtime:** Python 3.12. **Handler entry point:** `fraud_evaluator.handler`
— this exact name is what `infra/template.yaml` points at. If you rename
it, the infra folder has to change in the same PR.

---

## 2. Input contract (do not deviate)

The transaction payload shape is a **cross-team contract**, shared with
`frontend/lib/types.ts`. It is not this folder's to redefine unilaterally
— see [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

```python
# Required
cardholder_name: str
amount: str          # numeric string, e.g. "45.00"
ip_address: str
country_code: str    # ISO 3166-1 alpha-2, e.g. "GH"

# Optional — generate one server-side if absent
transaction_id: str
```

`validate_transaction()` should reject anything missing a required field
or with an unparseable `amount`, and report that record as a batch item
failure rather than crashing the whole invocation.

---

## 3. Scoring logic to implement

Deterministic, rule-based — **not ML.** There's no labeled fraud dataset
yet, so a transparent, explainable scorer is the right Phase 1 choice (see
`docs/decisions.md` for the full reasoning). Every flag should carry a
stated reason string; nothing should be a black box.

Three weighted heuristics, capped at 100:

| Heuristic | Weight | Rationale |
|---|---|---|
| `amount >= HIGH_AMOUNT_THRESHOLD` (default `$10,000`) | 60 | Largest single signal — big transactions carry the most exposure. |
| `country_code` in a small hardcoded high-risk list (default `KP,IR,SY,CU`) | 30 | Cheap geography signal — explicitly *not* a substitute for a real sanctions/geo-risk feed. |
| `ip_address` is private/non-routable (`10.x`, `192.168.x`, `127.x`) | 15 | Placeholder "IP anomaly" check, pending a real IP-reputation service. |

- `HIGH_AMOUNT_THRESHOLD`, `HIGH_RISK_COUNTRIES`, and `HIGH_RISK_SCORE_FLAG`
  (default `50`) must be Lambda **environment variables**, not hardcoded
  constants — `infra/template.yaml` sets them, and `frontend/app/emulator/page.tsx`
  mirrors the same values for its live risk-preview dial. Changing a
  weight or threshold means updating all three places in one PR.
- A transaction scoring `>= HIGH_RISK_SCORE_FLAG` is flagged and triggers
  an SNS alert.

### Output shape (audit row)

Every evaluated transaction gets written to DynamoDB as one `PutItem`,
matching `AuditRecord` in `frontend/lib/types.ts`:

```python
{
  "transaction_id": str,
  "cardholder_name": str,
  "amount": str,
  "ip_address": str,
  "country_code": str,
  "risk_score": int,          # 0-100
  "is_high_risk": bool,
  "reasons": list[str],       # one entry per triggered heuristic
  "evaluated_at": int,        # epoch timestamp
}
```

---

## 4. Batch handling — the part that has to be right

The trigger delivers up to 10 SQS records per invocation. **Each record
must be processed in isolation**, inside its own `try/except`:

- One malformed or failing record must **not** block or drop the healthy
  records in the same batch.
- Use SQS's `ReportBatchItemFailures` — the handler returns only the
  `messageId`s that actually failed, so only those get retried/DLQ'd.
- This only works end-to-end if `infra/template.yaml` has
  `FunctionResponseTypes: ReportBatchItemFailures` set on the event
  source mapping. If alerts on retried messages look wrong, check that
  config before assuming the bug is here.

---

## 5. Side effects per record

For every valid transaction:

1. `dynamodb:PutItem` — write the audit row. One call per transaction,
   keyed by `transaction_id`. (A resubmitted ID will overwrite the prior
   row — that's a known, accepted Phase 1 gap, not something to silently
   "fix" with your own dedup logic without discussing it first.)
2. `sns:Publish` — **only** if `is_high_risk` is `true`. Don't publish for
   every transaction; SNS is the alert channel, not a general event log.

---

## 6. Security requirements

- The Lambda's execution role (defined in `infra/template.yaml`) should
  grant **exactly** `dynamodb:PutItem` on the one audit table and
  `sns:Publish` on the one alert topic — nothing broader. If your code
  needs another permission, that's a signal to revisit the design, not to
  add a wildcard.
- No secrets or credentials in code. All AWS access goes through the
  Lambda's IAM role.
- `amount` and every other client-supplied value must be validated here,
  server-side — never trust the frontend's client-side validation as the
  real gate.

---

## 7. Local setup

```bash
cd lambda
pip install -r requirements.txt pytest --break-system-packages
AWS_DEFAULT_REGION=us-east-1 python -m pytest tests/ -v
```

`AWS_DEFAULT_REGION` is needed locally because `boto3` clients get created
at import time — inside a real Lambda this is set automatically by the
runtime.

Once `infra/template.yaml` exists, exercise the handler against a
realistic batch:

```bash
cd ../infra
sam local invoke FraudEvaluatorFunction --event events/sample-sqs-event.json
```

### Test coverage to write

Aim for the same ground the original suite covered — roughly:

- Validation: missing fields, malformed `amount`, malformed payload
- Scoring: each heuristic individually, and combinations
- Score capping at 100
- The `HIGH_RISK_SCORE_FLAG` boundary (just under / at / just over)
- Batch isolation: one bad record in a batch of several shouldn't affect
  the others' results or reporting

---

## 8. Explicitly out of scope for Phase 1

Don't build these now — they're deliberate cuts. Full reasoning in
`docs/architecture.md`, "Out of scope."

- Real velocity/behavioral checks (needs a stateful, cardholder-keyed
  store — e.g. a DynamoDB GSI plus a sliding time window)
- ML-based scoring (no labeled dataset to train against yet)
- Real IP reputation/geolocation (the IP heuristic is a known placeholder)
- A read API (this folder only writes; there's no `GET` path here)
- Dedup/idempotency on `transaction_id`

**Upgrade path**, for whenever these come back into scope: replace the
hardcoded country list with a maintained sanctions/geo-risk feed; replace
the IP heuristic with a real reputation service plus velocity checks;
move from fixed weights to a trained model once analyst-reviewed
dispositions exist to train against; wire a feedback loop from flagged
transactions back into whatever scorer runs next.

---

## 9. Contract with the other folders

- `infra/template.yaml` wires this function's IAM role, environment
  variables (`AUDIT_TABLE_NAME`, `ALERT_TOPIC_ARN`, threshold configs),
  and its SQS trigger. Changing an expected env var name means updating
  `infra/template.yaml` in the same PR.
- The payload shape (`cardholder_name`, `amount`, `ip_address`,
  `country_code`) is shared with `frontend/lib/types.ts`. See
  [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — any shape change lands in
  `infra/`, `lambda/`, and `frontend/` together, in one PR.

---

## Definition of done

- [ ] All tests pass locally (`pytest tests/ -v`)
- [ ] `sam local invoke` against `events/sample-sqs-event.json` produces
      the expected audit rows and alert for the high-risk record
- [ ] A malformed record in that batch fails on its own without affecting
      the other two
- [ ] Every threshold/weight is read from an env var, none hardcoded
- [ ] IAM role (in `infra/`) grants only `dynamodb:PutItem` + `sns:Publish`,
      each scoped to one resource
