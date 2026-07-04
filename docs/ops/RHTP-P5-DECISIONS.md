# RHTP P5 Decisions

**Date:** 2026-07-04
**Proof rung:** local operating decisions, no real PHI
**Source spec:** `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`

These decisions let the local device boundary move without pretending the real device rail is done.

## Closed Local Operating Decisions

| ID | Decision | Local operating choice | Why |
|---|---|---|---|
| D3 | Longitudinal instance granularity | One long-lived protocol instance per patient/pack, with high-frequency `insight.*` append lane | Matches Appendix C default and avoids reopening a new protocol instance for every reading while keeping noisy insight streams separate from terminal care-gap state. |
| D5 | CGM stream-vs-summary rule boundary | Raw per-night CGM inputs for nocturnal hyperglycemia-style rules; daily summaries for TIR decay-style rules | Matches Appendix C default and keeps pattern rules deterministic without making every summary rule depend on raw stream storage. |

## Still Open

| ID | Open item | Blocks |
|---|---|---|
| D4 | Exact PDC window and drug-class grouping for the HEDIS/RHTP `pdc_diabetes` measure | Production medication adherence floor and P6 pack metrics |

## Residual

The local P5 rail can prove source registration, canonical unit enforcement, FHIR provenance, non-diagnostic insight text, and web/native gating. Real P5 remains future work until native device sync, Dexcom OAuth/API, pharmacy PDC calculation, stream storage, and production FHIR writes exist.
