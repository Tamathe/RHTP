# RHTP Deploy Receipts

**Receipt log:** `docs/ops/RHTP-DEPLOY-RECEIPTS.jsonl`
**Current status:** no public preview receipt has been recorded yet.

This file describes the append-only proof log for no-PHI stakeholder preview deployments. A receipt is valid only after `npm run preview:verify` passes against a real deployed URL.

## Public Preview Receipt

After a preview deploy exists, run:

```powershell
$env:RHTP_PREVIEW_URL = "https://..."
$env:RHTP_DEPLOYMENT_ID = "dpl_..."
$env:RHTP_RECORD_PREVIEW_RECEIPT = "1"
npm run preview:verify
```

Optional override:

```powershell
$env:RHTP_DEPLOY_COMMIT = "<commit-sha>"
$env:RHTP_PREVIEW_RECEIPT_PATH = "docs/ops/RHTP-DEPLOY-RECEIPTS.jsonl"
```

The verifier appends one JSON object per line only when all public-preview checks pass:

- HTTPS preview URL.
- Vercel deployment id.
- HTTP 200 at `/`.
- Vite app-shell markers.
- `RHTP_REAL_PHI` off or unset.
- no open demo blockers.

No receipt means no public preview deployment proof.

After a receipt is recorded, check the deploy ladder and stakeholder packet:

```powershell
npm run ops:status -- --deploy
npm run release:packet
```

The deploy status view and stakeholder packet read the latest JSONL receipt and print the preview URL, Vercel deployment id, commit, and verification time.
