# RHTP Real-PHI Gates

**Status:** Blocked.
**Source:** Appendix B and Appendix C of `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`.

This file is the no-ambiguity gate for any deployment that touches real PHI. The current app can be deployed as a demo/prototype. It must not be treated as real-PHI pilot infrastructure until these controls are built, tested, and recorded in `docs/ops/rhtp-release-ledger.json`.

## Existential Gates

| ID | Gate | Required control | Current state |
|---|---|---|---|
| E1 | Model-in-the-crisis-path | Versioned deterministic recall floor, maintained adversarial corpus, model-net-only hits hard-lock and create rule-gap tickets, fail-safe alerting when model net degrades. | Closed for local P2 gate: safety gate, rule-gap tickets, and degraded-model ops alert state pass. Production alert transport still belongs to deployment-substrate work before real PHI. |
| E2 | Silent wrong-patient linkage | Deterministic strong-ID matches must corroborate DOB and/or name, downgrade mismatches to navigator review, and block autonomous outreach until first patient confirmation. | Local control verified: `npm run identity:gate` proves strong-ID-only matches downgrade to `identity_match_review` and no autonomous outreach occurs before patient confirmation. Still open for real-PHI until production MPI/claims/FHIR/HIE ingest integration proves the same behavior. |

## High-Severity Phase Gates

| ID | Gate | Phase | Required control | Current state |
|---|---|---|---|---|
| H1 | Grounding verifier is a stub | P2 exit | Deterministic verifier for clinical-adjacent claims using regex, lexicon, numeric normalization, and store-diff; model judge can add blocks only. | Closed locally: `npm run safety:gate` passes. |
| H2 | Async lane RLS bypass | P3 | Gateway-minted, single-patient, pack-scoped, short-lived token for every async job; no standing broad grant. | Open |
| H3 | Part 2 leakage through facility identity | Before P3 HIE and P7 BH packs | Deterministic code-set stripping plus facility-identity suppression before pack, insight, navigator, or outbound exposure. | Open |
| H4 | Break-glass is not Part 2 consent | P7 | Break-glass issuance, approval, TTL, mandatory review, audit event, and purpose-specific Part 2 consent. | Open |
| H5 | SMS condition-name leakage | P4 first SMS | Approved template library, deterministic slotting, disclosure linting in every shipped language, and category exclusion. | Open |

## Medium Controls That Must Not Disappear

| ID | Control | Owner area | Current state |
|---|---|---|---|
| M1 | Idempotency key includes pack version and rule version for insights. | Protocol event rail | Spec resolved, implementation pending for production rail. |
| M2 | Insight retractions flag existing navigator tasks and never silently close them. | Insight, patient alert, navigator UX | Spec resolved, implementation pending. |
| M3 | Copy lint and grounding verifier are language-complete. | Safety and content ops | Open |
| M4 | Stale facts require explicit re-verification before gap closure. | Provenance and navigator workflow | Open |
| M5 | Clinical thresholds require full versioned re-gate. | Packager and clinical safety | Spec resolved, implementation pending. |

## Non-Negotiable Pilot Claim

A future closeout may say "real-PHI pilot ready" only when:

1. Every `E*` and phase-relevant `H*` blocker is `closed` in the ledger.
2. The evidence path for each closed blocker is recorded.
3. Vendor/cloud BAA status is recorded.
4. The deploy target is not staging/demo data.
5. A clinical-safety owner has signed the phase gate.
