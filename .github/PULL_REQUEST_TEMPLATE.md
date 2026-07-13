## What does this change?

<!-- One or two sentences. Link an issue if there is one. -->

## Which folder(s) does this touch?

- [ ] `infra/`
- [ ] `lambda/`
- [ ] `frontend/`
- [ ] `docs/`
- [ ] `.github/`

## Security / contract checklist

- [ ] No hardcoded secrets, keys, or credentials introduced.
- [ ] Any new IAM policy statement names specific actions and specific
      resources — no `"Action": "*"`, no `"Resource": "*"`.
- [ ] If the transaction payload shape changed: `infra/`, `lambda/`, and
      `frontend/` were all updated in this PR (see `CONTRIBUTING.md`).
- [ ] If `lambda/fraud_evaluator.py` changed: tests were run locally and
      pass (`AWS_DEFAULT_REGION=us-east-1 python -m pytest tests/ -v`).
- [ ] If `infra/template.yaml` changed: `sam validate --lint` or
      `cfn-lint template.yaml` was run and passes.
- [ ] Any client-supplied value that affects money or risk (e.g. `amount`)
      is still validated server-side, not trusted from the client.

## How was this tested?

<!-- Commands you ran, and what you saw. -->
