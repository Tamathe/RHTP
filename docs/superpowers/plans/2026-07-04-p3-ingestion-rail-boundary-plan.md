# RHTP P3 Ingestion Rail Boundary Plan

**Date:** 2026-07-04
**Proof rung:** local demo backend, no real PHI
**Source spec:** `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`

## Goal

Build the local P3 ingestion boundary around the first patient-access claims sources so the repo can prove the shape of P3 before touching real PHI. The boundary must compose the already-built E2 identity corroboration, H2 async access, and H3 Part 2 controls.

This is not a production adapter. It does not connect to Medicare Blue Button 2.0, a Kentucky Medicaid MCO API, KHIE, TEFCA, or Medplum.

## Scope

- Register the P3 source vocabulary in seed state:
  - Medicare Blue Button 2.0
  - Kentucky Medicaid MCO Patient Access API
  - KHIE ADT subscription
- Add a patient-access claims ingest wrapper that:
  - requires a registered claims source
  - requires active patient consent
  - requires FHIR references on accepted facts
  - routes identity evidence through E2 corroboration
  - holds wrong-patient or weak-link claims for identity review
  - writes accepted claims as `patientConfirmed=false` source facts
- Add a route path for registered-source claims ingest without allowing caller-supplied source names.
- Add a P3 gate command that proves source registry, consent, FHIR provenance, identity review, H2 composition, and H3 composition.
- Record the P3 decisions that remove planning ambiguity without claiming production readiness.

## Non-Scope

- No real OAuth.
- No real claims, HIE, TEFCA, or FHIR-store calls.
- No production MPI.
- No production consent repository or database RLS.
- No production Part 2 storage or outbound-surface enforcement.
- No real-PHI deployment.

## Acceptance

- `npm run p3:gate` reports 6/6 cases passing.
- Registered-source claims ingest accepts only known P3 claims sources.
- Missing consent blocks before source facts are added.
- Accepted claims carry FHIR references and registered source names.
- Wrong-patient claims are held for identity review.
- P3 remains marked real-PHI blocked until production adapters and controls prove the same behavior.
