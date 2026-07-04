# RHTP Feature Flags

**Status:** No production flags are flipped. Stakeholder demo uses synthetic/local data and does not require real-PHI flags.
**Source of truth:** `docs/ops/rhtp-release-ledger.json`
**Status command:** `npm run ops:status -- --flags`

The server runtime now checks `RHTP_REAL_VOICE` for the Realtime session route. The Vite browser bundle accepts `NEXT_PUBLIC_RHTP_REAL_VOICE` through `envPrefix` and also accepts `VITE_RHTP_REAL_VOICE` as a local alias. Other phase flags are still registry entries until runtime code is added. The table below is the deployment registry so future work has a known set of switches and cannot quietly expose unfinished rails. For stakeholder demo, keep `RHTP_REAL_PHI=0` or unset.

## Registry

| Flag | Exposure | Default | Current | Phase | Flip condition |
|---|---|---|---|---|---|
| `RHTP_REAL_VOICE` | Server | Off | Runtime env default off | P2 | Real voice tool gateway, transcript storage, grounding verifier, and red-team gate pass. |
| `NEXT_PUBLIC_RHTP_REAL_VOICE` | Client | Off | Runtime env default off | P2 | Server flag is on and a browser bundle redeploy has happened. |
| `RHTP_FHIR_INGEST` | Server | Off | Not created | P3 | Patient-authorized claims/FHIR ingest, provenance, identity, consent, and RLS controls pass. |
| `RHTP_SMS_OUTREACH` | Server | Off | Not created | P4 | A2P path, disclosure-safe template library, opt-out, and delivery telemetry pass. |
| `NEXT_PUBLIC_RHTP_DEVICE_RAIL` | Client | Off | Not created | P5 | Native shell/device rail has production consent, source labeling, and no-dosing guardrails. |
| `RHTP_PROTOCOL_PACKS` | Server | Off | Not created | P6 | A second pack ships as configuration/content with zero new rail code. |
| `RHTP_REAL_PHI` | Server | Off | Not created | Cross-phase | All real-PHI gates close, BAAs are recorded, and clinical-safety sign-off is recorded. |

## Flip Protocol

1. Add or update the flag in `rhtp-release-ledger.json`.
2. Record environment, value, actor, and timestamp.
3. If the flag is client-exposed (`NEXT_PUBLIC_*`), redeploy the browser bundle.
4. Run `npm run ops:status -- --flags`.
5. Record the route/API proof that the flag changed behavior.

Do not infer a flag state from code. If the environment value and proof are not recorded, the flag is not flipped.
