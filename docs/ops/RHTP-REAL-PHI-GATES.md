# RHTP Real-PHI Gates

**Status:** Blocked.
**Source:** Appendix B and Appendix C of `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`.

This file is the no-ambiguity gate for any deployment that touches real PHI. The current app can be deployed as a stakeholder demo/prototype with synthetic/local seed data. These gates do not block the no-PHI demo lane; they only block real patient data, real outreach, production integrations, or any real-PHI pilot claim.

For demo readiness, the source of truth is:

```bash
npm run release:gate
```

That command must show `Validation: 3/3`, `Commands: 23/23`, `Cases: 6/6` for the stakeholder demo gate, `Cases: 6/6` for the equity metrics gate, `Cases: 5/5` for the billing artifact gate, `Cases: 5/5` for the coverage logistics gate, `Cases: 5/5` for the discharge explainer gate, `Cases: 5/5` for the navigator enrollment gate, `Cases: 5/5` for the grant reporting gate, `Cases: 5/5` for the Appendix B residual gate, and `Cases: 5/5` for the static preview smoke gate, then complete the full local test suite without enabling `RHTP_REAL_PHI`. The extra stakeholder-demo case asserts that the prototype scope declares `patientData=false` and defers E2, H2, H3, H4, and H5 outside the stakeholder prototype.

## Existential Gates

| ID | Gate | Required control | Current state |
|---|---|---|---|
| E1 | Model-in-the-crisis-path | Versioned deterministic recall floor, maintained adversarial corpus, model-net-only hits hard-lock and create rule-gap tickets, fail-safe alerting when model net degrades. | Closed for local P2 gate: safety gate, rule-gap tickets, and degraded-model ops alert state pass. Production alert transport still belongs to deployment-substrate work before real PHI. |
| E2 | Silent wrong-patient linkage | Deterministic strong-ID matches must corroborate DOB and/or name, downgrade mismatches to navigator review, and block autonomous outreach until first patient confirmation. | Local claims-ingest seam and local P3 patient-access claims boundary verified: `npm run identity:gate` and `npm run p3:gate` prove strong-ID-only matches downgrade to `identity_match_review`, wrong-patient P3 claims are held, and corroborated pre-confirmation claims facts land as non-outreach-driving `patientConfirmed=false` facts. Still open for real-PHI until production MPI/FHIR/claims/HIE adapters, storage, RLS, and Part 2 controls prove the same behavior. |

## High-Severity Phase Gates

| ID | Gate | Phase | Required control | Current state |
|---|---|---|---|---|
| H1 | Grounding verifier is a stub | P2 exit | Deterministic verifier for clinical-adjacent claims using regex, lexicon, numeric normalization, and store-diff; model judge can add blocks only. | Closed locally: `npm run safety:gate` passes. |
| H2 | Async lane RLS bypass | P3 | Gateway-minted, single-patient, pack-scoped, short-lived token for every async job; no standing broad grant. | Local control verified: `npm run async:gate` proves patient/pack-scoped token minting, matching reads, cross-patient/cross-pack blocks, expiry, revocation, audit events, and wildcard broad-grant rejection. Still open for real-PHI until production consent repository claims and database RLS policies enforce the same contract. |
| H3 | Part 2 leakage through facility identity | Before P3 HIE and P7 BH packs | Deterministic code-set stripping plus facility-identity suppression before pack, insight, navigator, or outbound exposure. | Local control verified: `npm run part2:gate` proves sensitive facility/category suppression, generic segmented-data review, fail-closed unknown dispositions, and safe non-sensitive ingestion. Still open for real-PHI until production HIE/FHIR adapters, storage policies, and outbound surfaces enforce the same rule. |
| H4 | Break-glass is not Part 2 consent | P7 | Break-glass issuance, approval, TTL, mandatory review, audit event, and purpose-specific Part 2 consent. | Local control verified: `npm run h4:gate` proves request/approval, TTL, expired-read blocking, post-hoc review, Part 2 purpose-consent, adolescent purpose-consent, guardian-proxy blocking, and category-match enforcement. Still open for real-PHI until production consent repository, segmented storage/RBAC/RLS, review workflow, and production legal/clinical owner sign-off are complete. |
| H5 | SMS condition-name leakage | P4 first SMS | Approved template library, deterministic slotting, disclosure linting in every shipped language, and category exclusion. | Local control verified: `npm run sms:gate` proves approved EN/ES templates, deterministic slots, category exclusion, and disclosure lint blocking condition names/unsafe slot values. Still open for production SMS until A2P registration, opt-out handling, sender controls, delivery telemetry, and live flagging are complete. |

## P3 Local Boundary

`npm run p3:gate` now proves a local P3 ingestion boundary: registered P3 source vocabulary, active-consent enforcement for patient-access claims, FHIR-reference requirements on accepted facts, wrong-patient hold for identity review, H2 async access composition, and H3 Part 2 composition.

This is still not real-PHI proof. The real-PHI gate remains closed until the same controls are enforced by production MPI, FHIR/claims/HIE adapters, consent repository claims, database RLS, Part 2 storage/outbound controls, and signed deployment ownership.

## P5 Local Boundary

`npm run p5:gate` now proves a local P5 device boundary: registered device source vocabulary, active-consent enforcement, canonical-unit enforcement, FHIR-reference requirements, non-diagnostic deterministic insight text, unsafe device-action blocking, and web/native gating.

This is still not real device proof. Real device use remains blocked until native shell work, HealthKit/Health Connect integration, Dexcom OAuth/API integration, pharmacy PDC calculation, stream storage, production FHIR writes, and real-PHI deployment controls exist.

## H4 Local Boundary

`npm run h4:gate` now proves a local break-glass consent boundary: request, approval, TTL, expired-read blocking, post-hoc review, purpose-specific Part 2 consent before segmented Part 2 access, purpose-specific adolescent consent, guardian-proxy blocking for adolescent facts, and category-match enforcement before segmented reads.

This is still not legal or real-PHI proof. Production use still requires real consent repository enforcement, segmented storage, RBAC/RLS, audit review workflow, legal/clinical owner sign-off, and operational owner sign-off.

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
