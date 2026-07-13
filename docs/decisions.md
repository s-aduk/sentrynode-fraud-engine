# Decisions Log

A running log of the architecturally significant calls made on this
project — what we chose, what we rejected, and why. Add new entries at the
top. Keep each entry short: the decision, 2-3 sentences of reasoning, and
what would make us revisit it.

---

## 2026-07 — API Gateway integrates directly with SQS (no Lambda in ingestion)

**Decision:** The HTTP API uses an `AWS_PROXY` / `SQS-SendMessage`
integration straight into the ingestion queue, rather than a Lambda that
validates and forwards.

**Why:** It removes a Lambda cold-start and an extra hop from the
synchronous request path — the client's POST returns as soon as the
message is durably queued. Validation still happens, just downstream in
`fraud_evaluator.py`, where a malformed record can be isolated and retried
without blocking the healthy records around it.

**Revisit if:** we need to reject malformed payloads synchronously (return
a 4xx to the client immediately) rather than accepting anything into the
queue and sorting it out async.

---

## 2026-07 — DynamoDB over RDS for the audit store

**Decision:** Use DynamoDB (`PAY_PER_REQUEST`) as the audit log, not RDS.

**Why:** The audit write pattern is a single-key `PutItem` per transaction
with no joins and no need for relational queries at Phase 1 — DynamoDB's
on-demand billing avoids provisioning a database instance up front and
fits AWS Free Tier without capacity planning. RDS would add an always-on
instance cost and a VPC/networking setup that buys nothing at this stage.

**Known pushback:** a reviewer flagged this in a project review, preferring
RDS for its query flexibility (joins, ad-hoc reporting, easier reads for
the eventual Monitoring Feed read API). That's a fair point once the
"query recent high-risk transactions by cardholder" or "aggregate by
country" use cases show up — DynamoDB access patterns have to be designed
up front, and we haven't designed one for reads yet (see
`docs/architecture.md` "out of scope" — no read API exists yet).

**Revisit if:** the read side needs flexible, ad-hoc querying (reporting,
joins across cardholders/merchants) rather than a small set of known access
patterns — that's the point to seriously evaluate RDS or add a
DynamoDB-to-RDS/Redshift export pipeline instead of forcing every future
query into DynamoDB's key-value model.

---

## 2026-07 — Deterministic rule-based scoring, not ML, for Phase 1

**Decision:** `fraud_evaluator.py` scores transactions with three weighted,
hardcoded heuristics (amount, country, IP shape), not a trained model.

**Why:** There's no labeled fraud/not-fraud dataset to train against yet.
A rule-based scorer is transparent (every flag has a stated reason),
fast to ship, and good enough to prove the pipeline end-to-end. Building
an ML pipeline before there's data to train on would be solving a problem
that doesn't exist yet.

**Revisit if:** we accumulate enough analyst-reviewed dispositions (true/
false positive labels on flagged transactions) to train and validate a
model against a real baseline.

---

<!-- Add new entries above this line. Format:
## YYYY-MM — Short decision title
**Decision:** what we chose.
**Why:** 2-3 sentences of reasoning.
**Revisit if:** the condition that would make us reconsider.
-->
