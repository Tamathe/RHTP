# RHTP Deployment Control

**Status:** Local prototype and P1 backend are buildable. Real-PHI pilot deployment is blocked.
**Source spec:** `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`
**Ledger:** `docs/ops/rhtp-release-ledger.json`
**Status command:** `npm run ops:status`

This is the operational wrapper around the production technical spec. The spec says what the platform must become; this control file says what is built, what is blocked, what flags exist or are planned, and which proof rung has actually been reached.

## Current Proof Rung

| Rung | State | Meaning |
|---|---|---|
| Local app | Ready | Vite app can run from the repo with seed/demo data. |
| Local backend | Ready | P1 backend can run locally with file-backed demo state. |
| Static preview deploy | Ready to attempt | Vercel is configured for the Vite app, but no deploy was run in this pass. |
| Real-PHI pilot | Blocked | Appendix B hard gates and high-severity controls are not closed. |

Do not describe the platform as PHI-ready, pilot-ready, or production clinical infrastructure until the hard gates in `docs/ops/RHTP-REAL-PHI-GATES.md` are closed and recorded in the ledger.

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
| P3 | Local ingestion boundary verified, real-PHI blocked | P3 source registry and patient-access claims boundary are verified locally with consent checks, FHIR provenance, E2 identity corroboration, H2 async access composition, and H3 Part 2 composition. Real Blue Button/MCO/KHIE/FHIR-store adapters and production MPI/consent/RLS/Part 2 controls are not built. |
| P4 | Not built, blocked | Retinopathy pilot cannot start until P2/P3 gates and production SMS controls close. Local H5 SMS template/lint control is verified, but SMS outreach is not production-ready. |
| P5 | Local device boundary verified, real device rail blocked | Device source registry, canonical unit checks, FHIR provenance, non-diagnostic local insight summaries, unsafe device-action blocking, web/native gating, and local D4 PDC diabetes adherence policy/math are verified locally. Native shell, HealthKit/Health Connect, Dexcom API, production pharmacy claims feeds, stream storage, and production FHIR writes are not built. |
| P6 | Not built | Protocol-pack platform proof remains future work; D4 no longer blocks the local pack-metrics policy, but P6 still needs actual zero-rail-code pack delivery. |
| P7 | Blocked with local H4 and D2 gates verified | Break-glass request/approval, TTL, post-hoc review, Part 2 purpose-consent, adolescent purpose-consent, guardian-proxy blocking, category-match enforcement, and Kentucky adolescent consent/proxy policy are verified locally. Screenings/campaigns still require production consent/RLS/proxy-portal controls and legal/clinical owner sign-off before real PHI. |
| P8 | Not built | Scale/writeback remains future work. |

## Deploy Discipline

| Claim | Required proof |
|---|---|
| Local app works | `npm run build` passes, or a named local browser check passes. |
| Local backend works | `npm run server:test` passes, or named API route checks pass. |
| Local P3 ingestion boundary works | `npm run p3:gate` passes and the P3 result note is recorded. |
| Local D4 PDC adherence boundary works | `npm run d4:gate` passes and the D4 result note is recorded. |
| Local P5 device boundary works | `npm run p5:gate` passes and the P5 result note is recorded. |
| Local H4 break-glass boundary works | `npm run h4:gate` passes and the H4 result note is recorded. |
| Local D2 adolescent consent boundary works | `npm run d2:gate` passes and the D2 result note is recorded. |
| Preview deployed | Deployment URL, deployment id, and smoke result are recorded. |
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
