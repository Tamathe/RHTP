# RHTP Deployment Control

**Status:** Stakeholder no-PHI demo is ready to preview with synthetic/local data. Real-PHI pilot deployment is blocked.
**Source spec:** `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`
**Ledger:** `docs/ops/rhtp-release-ledger.json`
**Status command:** `npm run ops:status`

This is the operational wrapper around the production technical spec. The spec says what the platform must become; this control file says what is built, what is blocked, what flags exist or are planned, and which proof rung has actually been reached.

## Current Proof Rung

| Rung | State | Meaning |
|---|---|---|
| Local app | Ready | Vite app can run from the repo with seed/demo data. |
| Local backend | Ready | P1 backend can run locally with file-backed demo state. |
| Stakeholder demo | Ready | Synthetic/local seed data only; real-PHI flags stay off. |
| Static preview deploy | Local static preview verified | `npm run preview:gate` builds, serves the static bundle locally, fetches `/`, and verifies the no-PHI app shell plus Vercel SPA rewrite. No public deploy was run in this pass. |
| Real-PHI pilot | Blocked | Appendix B hard gates and high-severity controls are not closed. |

Do not describe the platform as PHI-ready, pilot-ready, or production clinical infrastructure until the hard gates in `docs/ops/RHTP-REAL-PHI-GATES.md` are closed and recorded in the ledger. For stakeholder review, describe it as a no-PHI prototype demo.

## Operating Rule

Every phase change updates the ledger first, then the docs:

1. Update `docs/ops/rhtp-release-ledger.json`.
2. Run `npm run ops:status`.
3. Run the relevant proof command for the phase.
4. Record the proof in the ledger before claiming the rung.

## What The Ledger Tracks

| Area | Field | Rule |
|---|---|---|
| Built work | `phases`, `workstreams` | Mark the highest proof reached: `built`, `verified`, `ready_to_attempt`, `blocked`, or `not_built`. |
| Blockers | `blockers` | Every blocker has an id, severity, phase gate, required control, and status. |
| Flags | `featureFlags` | Every flag has a default, exposure, current value, phase, and flip condition. |
| Deploy targets | `deployTargets` | Local, preview, and PHI-pilot targets are tracked separately. |
| Decisions | `decisions` | Phase-blocking decisions are owned explicitly before the phase starts. |

## Phase Ledger

| Phase | Current state | Notes |
|---|---|---|
| P0 | Built and verified | Production-shaped retinopathy prototype exists in the React app. |
| P1 | Built and verified | Backend persistence, audit, route handler, and local API server exist. |
| P2 | Local voice red-team verified | Grounding verifier, crisis recall floor, model-backstop rule-gap ticketing, degraded-model ops alert state, server-gated Realtime client-secret minting, browser WebRTC attach code, transcript persistence, Sandy tool gateway routing, no-PHI local voice red-team harness, live voice preflight command, and browser live-latency metrics hook exist locally behind off-by-default flags. Live Realtime audio red-team and live p95/p99 latency proof remain pending. |
| P3 | Local ingestion boundary verified, demo-ready, real-PHI blocked | P3 source registry and patient-access claims boundary are verified locally with consent checks, FHIR provenance, E2 identity corroboration, H2 async access composition, and H3 Part 2 composition. Real Blue Button/MCO/KHIE/FHIR-store adapters and production MPI/consent/RLS/Part 2 controls are not built and are not needed for the stakeholder demo. |
| P4 | Demo-ready, real-PHI blocked | The retinopathy stakeholder story can be shown with synthetic/local data. Production pilot and SMS outreach still require P2/P3 real-PHI controls and production SMS operations. |
| P5 | Local device boundary verified, real device rail blocked | Device source registry, canonical unit checks, FHIR provenance, non-diagnostic local insight summaries, unsafe device-action blocking, web/native gating, and local D4 PDC diabetes adherence policy/math are verified locally. Native shell, HealthKit/Health Connect, Dexcom API, production pharmacy claims feeds, stream storage, and production FHIR writes are not built. |
| P6 | Local protocol-pack config verified, demo-ready, real integrations blocked | Retinopathy plus hypertension, PDC adherence, and transitional care are declared as protocol-pack manifests and pass the local pack-is-config gate. Real KHIE ADT, live pharmacy/claims feeds, production pack publication, and reportable outcome integrations are not built. |
| P7 | Local screenings/campaigns gate verified, demo-ready, real-PHI blocked | PHQ/GAD locked item text, deterministic scoring, rule-based crisis route, SDOH assistive-only behavior, and vaccination campaign barrier rail reuse are verified locally, alongside H4 and D2 controls. Real behavioral-health/SDOH production use still requires consent/RLS/proxy-portal controls and legal/clinical owner sign-off before real PHI. |
| P8 | Local writeback boundary verified, demo-ready, real EMR blocked | Local clinician-summary/writeback gate verifies navigator review before approval, prohibited content blocking, P8/EMR-launch surface gating, and synthetic multi-county expansion proof. Real SMART-on-FHIR launch, EMR persistence, TEFCA IAS, and live multi-county expansion are not built. |

## Deploy Discipline

| Claim | Required proof |
|---|---|
| Local app works | `npm run build` passes, or a named local browser check passes. |
| Local backend works | `npm run server:test` passes, or named API route checks pass. |
| Local P3 ingestion boundary works | `npm run p3:gate` passes and the P3 result note is recorded. |
| Local D4 PDC adherence boundary works | `npm run d4:gate` passes and the D4 result note is recorded. |
| Local P5 device boundary works | `npm run p5:gate` passes and the P5 result note is recorded. |
| Local P6 protocol-pack config works | `npm run p6:gate` passes and the P6 result note is recorded. |
| Local P7 screenings/campaigns boundary works | `npm run p7:gate` passes and the P7 result note is recorded. |
| Local P8 writeback boundary works | `npm run p8:gate` passes and the P8 result note is recorded. |
| Local H4 break-glass boundary works | `npm run h4:gate` passes and the H4 result note is recorded. |
| Local D2 adolescent consent boundary works | `npm run d2:gate` passes and the D2 result note is recorded. |
| Stakeholder demo ready | `npm run demo:gate` passes: no open demo blockers, `RHTP_REAL_PHI` off/unset, stakeholder target no-PHI, open E/H gates real-PHI-only, and build passes. |
| Local static preview works | `npm run preview:gate` passes: stakeholder demo gate, build, local Vite preview HTTP 200, app-shell markers, SPA rewrite, and no-PHI checks. |
| Preview deployed | `RHTP_PREVIEW_URL=https://... RHTP_DEPLOYMENT_ID=dpl_... npm run preview:verify` passes and the URL, deployment id, commit, and receipt are recorded. |
| Feature flag flipped | Flag key, environment, value, actor, time, and redeploy requirement are recorded. |
| Real-PHI ready | All hard gates are closed, vendor/cloud BAAs are recorded, and clinical safety sign-off is recorded. |

## Update Template

When work lands, update the relevant object in `rhtp-release-ledger.json`:

```json
{
  "id": "P2",
  "status": "verified",
  "proof": [
    "npm run test -- server/actions.test.ts",
    "docs/ops/red-team-results/2026-07-04-real-voice.md"
  ],
  "blockers": []
}
```

Keep status honest. A passing local build is not a deploy. A deploy is not a live clinical pilot. A flag in the ledger is not flipped unless the environment value is recorded.
