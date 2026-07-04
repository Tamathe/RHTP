# RHTP P3 Decisions

**Date:** 2026-07-04
**Proof rung:** local operating decisions, no real PHI
**Source spec:** `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`

These decisions remove P3 planning ambiguity for local implementation. They are not vendor contracts, legal approvals, or production deployment proof.

## Closed Local Operating Decisions

| ID | Decision | Local operating choice | Why |
|---|---|---|---|
| D1 | MPI ownership | Own MPI plus multi-field corroboration | Matches Appendix C default and the E2 gate: strong ID alone is not enough; DOB and/or name must corroborate before auto-link. |
| FHIR_STORE | First FHIR store path | Medplum self-hosted | Matches Appendix C platform recommendation for control and pilot-scale run cost. Revisit at multi-state scale or if hosting/ops constraints require a managed service. |
| NATIVE_SHELL_TIMING | Native shell timing | P5 with the device rail | Keeps P0-P4 web/PWA reachable and pays app-store friction only when HealthKit/Health Connect device sync ships. |
| DEVICE_AGGREGATOR | Device aggregator | Skip for the first path | Use HealthKit/Health Connect, Dexcom, and claims-PDC first; buy Validic/Terra only if a pilot demands device breadth before direct paths land. |
| KENTUCKY_HEALTH_LLM | Kentucky Health LLM lane | Park until P5+ | Rules-first rails and approved content are sufficient for P2-P4; no custom health LLM belongs in the critical path yet. |

## Still Open For P3/P4 Execution

| ID | Open item | Blocks |
|---|---|---|
| FIRST_MEDICAID_MCO | Choose the first Kentucky Medicaid MCO owner/path for Patient Access API work. | Real P3 claims adapter |
| KHIE_OWNER | Name the KHIE engagement owner and start participation conversations. | Real P3/P6 HIE work |
| MODEL_BAAS | Execute BAA/zero-retention path for OpenAI voice and Anthropic reasoning before real PHI. | Real-PHI pilot |

## Residual

The local P3 gate can proceed against the chosen MPI/FHIR defaults. Real-PHI P3 remains blocked until the production adapters, consent repository, RLS, Part 2, and deployment-substrate controls prove the same behavior with signed operational ownership.
