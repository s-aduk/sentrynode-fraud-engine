# frontend/

A Next.js 14 (App Router, static export) console with two views: a
**Transaction Emulator** to send synthetic transactions through the real
pipeline, and a **Monitoring Feed** for reviewing evaluated transactions.

## What lives here

- `app/page.tsx` — landing overview of the pipeline.
- `app/emulator/page.tsx` — the transaction form + live risk-preview dial.
- `app/monitoring/page.tsx` — the audit table view (honest "not connected"
  state until a read API exists — see Known gaps).
- `components/RiskMeter.tsx` — the signature radar-sweep risk dial.
- `components/Nav.tsx` — shared top navigation.
- `lib/api.ts` — **every** network call to the backend goes through this
  file. Nothing else should call `fetch()` against the ingestion or
  monitoring endpoints directly.
- `lib/types.ts` — the shared `TransactionPayload`/`AuditRecord` shape.
  This is a cross-folder contract — see `CONTRIBUTING.md`.

## Local setup

```bash
cd frontend
npm install
cp .env.example .env.local
# edit .env.local: set NEXT_PUBLIC_INGESTION_API_URL to the IngestionApiUrl
# from `sam deploy` output in infra/
npm run dev
```

Build (static export, matches how it'd actually be hosted):

```bash
npm run build
# output goes to frontend/out/ — deploy to S3+CloudFront, Amplify, or any
# static host
```

## Design

This is a fraud-ops console, not a generic admin dashboard. The palette and
type choices are deliberate, not defaults:

| Token | Hex | Use |
|---|---|---|
| `base` | `#0B0F14` | Primary background — near-black slate |
| `panel` | `#131A22` | Elevated surfaces (cards, table header) |
| `line` | `#22303C` | Hairline borders/dividers |
| `ink` | `#D8E1E8` | Primary text |
| `mute` | `#6E8494` | Secondary text/captions |
| `signal` | `#3DDC97` | Safe/healthy state — reserved for actual low-risk state |
| `watch` | `#F5A623` | Medium-risk state — reserved for actual watch-level scores |
| `alert` | `#FF4F5E` | High-risk state — reserved for actual high-risk scores |

Type: a geometric display face paired with a neutral body face and a
monospace face for all data (amounts, scores, IDs, country codes) — the
monospace choice is deliberate, it reads as instrumentation, not prose.

**Signature element:** the risk meter on the Emulator page is a radar-style
dial with a slow rotating sweep (ambient "always watching" texture, paused
under `prefers-reduced-motion`) and a fill/color that tracks the live
client-side risk preview as the operator types. It pulses when the score
crosses into high-risk. Everything else on the page stays quiet around it.

Semantic colors (`signal`/`watch`/`alert`) are reserved strictly for actual
risk state — never used decoratively elsewhere in the UI.

Fonts are self-hosted system stacks (no Google Fonts network fetch) — see
`app/globals.css` — which keeps builds hermetic and avoids an unnecessary
third-party network call from a security-focused tool.

## Known gaps

- **Monitoring Feed has no backend yet.** `infra/` doesn't currently
  expose a read endpoint for `AuditTable` (see `docs/architecture.md`,
  "out of scope"). The page shows an honest "Not connected" state rather
  than faking data. Set `NEXT_PUBLIC_MONITORING_API_URL` once a read API
  exists, and `lib/api.ts#fetchAuditFeed` will pick it up automatically.
- **The risk meter is a client-side preview, not the real score.** It
  mirrors the Phase 1 heuristic weights so it can update instantly as the
  operator types, but the Lambda's evaluation is always authoritative.
  Keep the mirrored constants in `app/emulator/page.tsx` in sync with
  `lambda/fraud_evaluator.py` — see `CONTRIBUTING.md`.
- No authentication on the emulator form — anyone with the deployed URL
  can submit transactions. Matches the backend's current scope.

## Dependencies on other folders

- `lib/api.ts` calls the URL from `infra/template.yaml`'s `IngestionApiUrl`
  output (via `NEXT_PUBLIC_INGESTION_API_URL`).
- `lib/types.ts`'s `TransactionPayload` shape must match what
  `lambda/fraud_evaluator.py#validate_transaction` expects. Any change to
  field names or types is a contract change — see `CONTRIBUTING.md`.
