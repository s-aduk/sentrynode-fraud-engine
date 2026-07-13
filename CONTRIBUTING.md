# Contributing to SentryNode Fraud Engine

## Branch naming

`<type>/<short-description>`, where `<type>` is one of:
`feat`, `fix`, `docs`, `infra`, `test`, `chore`

Examples: `feat/velocity-check-heuristic`, `infra/add-read-api`,
`fix/cors-origin-typo`.

## PR process

1. Open a PR against `main`. Use the PR template — it includes the
   security/contract checklist below.
2. At least one other contributor reviews before merge. If you touched
   `infra/template.yaml`, note in the PR description whether you ran
   `sam validate --lint` (or `cfn-lint`) and what the result was.
3. If you touched `lambda/fraud_evaluator.py`, note whether you ran the
   test suite and it passed.
4. Squash-merge once approved.

## The shared-contract rule (read this before touching the transaction shape)

The transaction payload shape — `cardholder_name`, `amount`, `ip_address`,
`country_code` — is used **simultaneously** by three folders:

- `infra/template.yaml` (the API Gateway route passes the raw body through
  to SQS unmodified — it doesn't validate shape, but downstream code
  assumes this shape)
- `lambda/fraud_evaluator.py` (`validate_transaction` parses exactly these
  fields)
- `frontend/lib/types.ts` (`TransactionPayload`) and
  `frontend/app/emulator/page.tsx` (the form that produces it, and the
  client-side heuristic-preview constants that mirror the Lambda's weights)

**Rule: any change to this shape — adding, removing, renaming, or
retyping a field, or changing a scoring weight/threshold — must update all
three folders in the same PR.** Never let them drift silently. A PR that
changes `lambda/fraud_evaluator.py`'s validation without a matching
`frontend/lib/types.ts` update (or vice versa) should be rejected in
review.

This also applies to the heuristic weights and thresholds specifically:
`frontend/app/emulator/page.tsx` mirrors `HIGH_AMOUNT_THRESHOLD`,
`HIGH_RISK_COUNTRIES`, and the three heuristic weights from
`lambda/fraud_evaluator.py` for its live risk-preview dial. If you change
one, change the other.

## PR security/contract checklist

(Also in the PR template — repeated here for reference.)

- [ ] No hardcoded secrets, keys, or credentials introduced.
- [ ] Any new IAM policy statement names specific actions and specific
      resources — no `"Action": "*"`, no `"Resource": "*"`.
- [ ] If the transaction payload shape changed: `infra/`, `lambda/`, and
      `frontend/` were all updated in this PR.
- [ ] If `lambda/fraud_evaluator.py` changed: tests were run and pass.
- [ ] If `infra/template.yaml` changed: `sam validate --lint` or
      `cfn-lint` was run against it.
- [ ] Any client-supplied value that affects money or risk (e.g. `amount`)
      is still validated server-side, not trusted from the client.

## Ownership

| Folder | Primary concern | Touch it when you're changing... |
|---|---|---|
| `infra/` | AWS resources, IAM, networking | Any new AWS service, permission, or config value |
| `lambda/` | Fraud scoring logic, validation | Heuristics, thresholds, validation rules, batch handling |
| `frontend/` | Console UI | Emulator form, Monitoring Feed, design system |
| `docs/` | Architecture record | Any decision worth explaining to a future contributor |
| `.github/` | CI, templates | Build/test/lint jobs, PR/issue templates |

There's no formal per-folder code-owner assignment yet at MVP stage — this
table is a starting point for who to loop in, not an enforced gate.
