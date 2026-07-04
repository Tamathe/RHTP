# RHTP Deployment Runbook

**Current allowed deployment:** demo/prototype only.
**Blocked deployment:** any real-PHI pilot.

## Local App

```bash
npm install
npm run build
npm run dev
```

Record proof in `docs/ops/rhtp-release-ledger.json` if the build or browser check is used as a milestone.

## Local Backend

```bash
npm run server:test
npm run server:dev
```

The backend is a P1 local demo backend with file-persisted seed state. It is not a HIPAA deployment substrate.

## Status Dashboard

```bash
npm run ops:status
npm run ops:status -- --blockers
npm run ops:status -- --flags
```

Use this before and after deploy work. The output is only as current as `docs/ops/rhtp-release-ledger.json`.

## Preview Deployment

The repo has `vercel.json` configured for a static Vite app rewrite. Before a preview or production static deploy:

```bash
npm run build
```

Then deploy with the chosen deployment tool and record:

```json
{
  "target": "vercel_static_preview",
  "url": "https://...",
  "deploymentId": "dpl_...",
  "commit": "...",
  "proof": ["GET / returned 200"],
  "phi": false
}
```

## Real-PHI Deployment

Stop. Real-PHI deployment is blocked until `docs/ops/RHTP-REAL-PHI-GATES.md` is closed in the ledger.

The future real-PHI runbook must add:

- HIPAA-eligible cloud account and BAA chain.
- Private network and IaC.
- Secrets and KMS policy.
- FHIR store deployment.
- Synthetic-only staging data.
- Backup, restore drill, and incident-response proof.
- Clinical-safety sign-off.
