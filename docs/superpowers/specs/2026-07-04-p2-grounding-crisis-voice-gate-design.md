# P2 Grounding, Crisis Recall, And Real Voice Gate Design

**Date:** 2026-07-04
**Status:** Approved for implementation
**Source spec:** `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`
**Operational source:** `docs/ops/rhtp-release-ledger.json`

## Goal

Build the first enforceable P2 safety gate: deterministic grounding verification for Sandy answers, a versioned crisis/red-flag rule set, an adversarial recall corpus, and a local gate command that must pass before real voice can be treated as ready.

This does not turn on real voice. It creates the gate real voice must pass through.

## Scope

This slice covers:

- H1: deterministic grounding verifier for clinical-adjacent answers.
- E1 partial: deterministic crisis/red-flag recall floor and maintained adversarial corpus.
- P2 gate wiring: a command that fails when H1 or deterministic E1 evidence is below threshold.
- Ops ledger updates that keep `RHTP_REAL_VOICE` off until the gate is recorded.

This slice does not cover:

- Live Realtime/WebRTC sessions.
- Model-vendor calls.
- Model-net failover behavior in production.
- PHI-ready cloud, BAAs, VPC, secrets, observability, or incident response.

## Design

### 1. Grounding Verifier

Create `src/lib/grounding.ts` as a pure TypeScript verifier. It accepts a draft Sandy answer plus trusted `SourceFact` records and returns `allowed` or `blocked` with structured findings.

The verifier is deterministic. It uses:

- regex and phrase lexicons for clinical-adjacent claims;
- numeric normalization for A1C-like claims;
- source-fact lookup for cited claim support;
- hard blocks for diagnosis, dosing, medication-change, and unsupported normal-result claims.

The verifier is the primary block layer. A future model judge may only add blocks, never allow text that this verifier blocks.

### 2. Crisis And Red-Flag Recall

Create `src/lib/crisis-red-flags.ts` as the versioned detector for crisis and red-flag text. The existing `screenPatientMessage` in `src/lib/safety.ts` will call this detector instead of owning ad hoc regexes directly.

The detector returns:

- `matched`: whether the message must trigger red-flag lock;
- `source`: `deterministic` or `model_backstop`;
- `ruleIds`: matched deterministic rule ids;
- `requiresRuleGapTicket`: true when the future model backstop catches something deterministic rules missed.

The initial deterministic domains are:

- retinopathy/vision red flags;
- suicidal ideation and self-harm;
- acute medical danger examples that should route to human help rather than coaching.

### 3. Adversarial Corpus And Gate

Create `src/lib/crisis-red-flags.corpus.ts` as the maintained corpus. The first corpus is small but explicit: every case has an id, text, expected red-flag result, and domain.

Create `scripts/rhtp-safety-gate.ts` to:

- run deterministic crisis recall against the corpus;
- fail below the configured recall floor;
- run grounding verifier adversarial cases;
- print a concise pass/fail report;
- exit nonzero if the gate fails.

The first recall floor is `0.95`. The first corpus should pass at `1.00`. The floor is lower than the current pass rate so future corpus growth can distinguish "regression" from "new gap that needs rule work."

### 4. Runtime Wiring

Update:

- `src/lib/safety.ts` to call `screenCrisisRedFlags`.
- `server/actions.ts` and `src/store/useStore.ts` indirectly gain broader crisis detection through `screenPatientMessage`.

The current red-flag behavior remains:

- patient message preserved;
- `red_flag_reported` protocol event emitted;
- urgent navigator queue item created;
- routine Sandy coaching locked until human review.

### 5. Ops Ledger

Update the ledger after implementation:

- H1 can close if grounding tests and `npm run safety:gate` pass.
- E1 remains open unless model-net backstop degradation behavior and ops alerting are implemented.
- P2 remains blocked while E1 is still open and real voice plumbing is not built.

## Acceptance Criteria

1. `npm run test -- src/lib/grounding.test.ts` passes.
2. `npm run test -- src/lib/crisis-red-flags.test.ts src/lib/safety.test.ts server/actions.test.ts src/store/useStore.test.ts` passes.
3. `npm run safety:gate` passes and reports deterministic recall at or above `0.95`.
4. `npm run build` passes.
5. Ops ledger records H1 proof and keeps E1/P2 honest.

## Self Review

- No placeholders remain.
- The design does not claim real voice is enabled.
- The design does not claim real-PHI readiness.
- H1 and E1 are separated so the repo can close deterministic grounding without overclaiming the model-backstop residual.
