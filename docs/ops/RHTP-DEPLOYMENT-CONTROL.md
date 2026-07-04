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
| P2 | Tool gateway verified | Grounding verifier, crisis recall floor, model-backstop rule-gap ticketing, degraded-model ops alert state, server-gated Realtime client-secret minting, browser WebRTC attach code, transcript persistence, and Sandy tool gateway routing exist locally behind off-by-default flags. Full live voice-journey red-team and latency proof remain pending. |
| P3 | Not built, blocked | FHIR/claims/HIE ingestion requires identity, consent, RLS, and Part 2 controls. |
| P4 | Not built, blocked | Retinopathy pilot cannot start until P2/P3 gates and SMS disclosure controls close. |
| P5 | Not built | Device rail, native shell, and insight engine remain future work. |
| P6 | Not built | Protocol-pack platform proof remains future work. |
| P7 | Not built, blocked | Screenings/campaigns require crisis, consent, and adolescent-confidentiality controls. |
| P8 | Not built | Scale/writeback remains future work. |

## Deploy Discipline

| Claim | Required proof |
|---|---|
| Local app works | `npm run build` passes, or a named local browser check passes. |
| Local backend works | `npm run server:test` passes, or named API route checks pass. |
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
