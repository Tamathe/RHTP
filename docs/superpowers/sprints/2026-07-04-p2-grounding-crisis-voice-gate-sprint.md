# Sprint: P2 grounding, crisis recall, and real voice gate
**Started:** 2026-07-04
**Spec:** docs/superpowers/specs/2026-07-04-p2-grounding-crisis-voice-gate-design.md
**Plan:** docs/superpowers/plans/2026-07-04-p2-grounding-crisis-voice-gate-plan.md

## Current Phase
Phase 5 - Verified locally

## Phase 1 - Discovery
**Status:** done
**Context:** Existing safety layer is `src/lib/safety.ts`: retinopathy red-flag regexes, off-protocol fallback, and autonomous-action allowlist. Backend voice actions in `server/actions.ts` and frontend store actions in `src/store/useStore.ts` already pause routine coaching after red flags and create urgent navigator work. Ops ledger tracks H1/E1/P2 as open blockers. There is no grounding verifier, adversarial crisis corpus, recall-floor check, red-team suite, or real Realtime/WebRTC voice plumbing yet.
**Constraints:** H1 must be deterministic primary grounding verification. E1 must establish a measured crisis/red-flag recall floor with adversarial corpus and model-net backstop feeding rules. P2 real voice must stay off until these gates pass.
**Decisions:** Treat H1/E1 as the foundation gate before real voice plumbing can be marked ready.

## Phase 2 - Design
**Status:** done
**Approaches presented:** yes
**Design sections approved:** P2 safety gate first, real voice second
**Open items:** none

## Phase 3 - Documentation
**Status:** done
**Spec path:** docs/superpowers/specs/2026-07-04-p2-grounding-crisis-voice-gate-design.md
**Spec approved:** yes

## Phase 4 - Handoff
**Status:** done

## Implementation
**Status:** verified locally
**Proof:** `npm run test -- src/lib/grounding.test.ts src/lib/crisis-red-flags.test.ts src/lib/safety.test.ts server/actions.test.ts server/routes.test.ts src/store/useStore.test.ts`; `npm run safety:gate`; `npm run ops:status -- --blockers`; `npm run build`; `npm test`
**Ledger:** H1 and E1 closed for the local P2 safety gate; real voice server session plumbing is built behind `RHTP_REAL_VOICE`, but flags remain off and browser WebRTC attach, transcript storage, and live tool gateway are pending.

## Next Action
Attach the browser WebRTC flow behind `NEXT_PUBLIC_RHTP_REAL_VOICE`, then add transcript persistence and the Sandy tool gateway before any P2 real voice exit claim.
