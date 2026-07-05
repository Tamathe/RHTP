# Public Preview Verifier Result

**Date:** 2026-07-04
**Command:** `npm run preview:verify`
**Proof rung:** verifier built; public preview URL not yet supplied

```text
npm run preview:verify
RHTP_PREVIEW_URL is required
```

## Interpretation

- The public-preview verifier exists and fails closed without an explicit deployment URL.
- When `RHTP_PREVIEW_URL` and `RHTP_DEPLOYMENT_ID` are supplied, the verifier fetches the URL and checks:
  - HTTPS deployment URL.
  - Vercel deployment id.
  - HTTP 200 response.
  - Vite app-shell markers.
  - `RHTP_REAL_PHI` off or unset.
  - no open demo blockers.
- A successful run prints a one-line JSON receipt with `target=vercel_static_preview`, URL, deployment id, commit, proof list, case results, and `phi=false`.
- When `RHTP_RECORD_PREVIEW_RECEIPT=1`, a successful run appends the receipt to `docs/ops/RHTP-DEPLOY-RECEIPTS.jsonl`.

## Residual

No public preview URL or deployment id has been produced in this pass. Public deployment remains unproven until the repo is pushed/deployed and `npm run preview:verify` passes against the deployed URL. No JSONL deploy receipt has been recorded yet.
