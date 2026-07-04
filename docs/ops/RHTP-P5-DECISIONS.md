# RHTP P5 Decisions

**Date:** 2026-07-04
**Proof rung:** local operating decisions, no real PHI
**Source spec:** `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`

These decisions let the local device boundary move without pretending the real device rail is done.

## Closed Local Operating Decisions

| ID | Decision | Local operating choice | Why |
|---|---|---|---|
| D3 | Longitudinal instance granularity | One long-lived protocol instance per patient/pack, with high-frequency `insight.*` append lane | Matches Appendix C default and avoids reopening a new protocol instance for every reading while keeping noisy insight streams separate from terminal care-gap state. |
| D4 | PDC window and drug-class grouping for `pdc_diabetes` | Use CMS 2026 QRS/PQA Diabetes All Class PDC-DR locally: treatment period runs from IPSD to measurement-year end/disenrollment/death, PDC threshold is 80%, included medication tables are BG, SFU, TZD, DPP4, GIP/GLP1, MEG, and SGLT2, same-target-drug overlap carries forward, insulin claims exclude, unknown drugs route to review | Matches the public CMS/PQA measure shape and preserves the claims-PDC equity floor without relying on smart-bottle/device ownership. |
| D5 | CGM stream-vs-summary rule boundary | Raw per-night CGM inputs for nocturnal hyperglycemia-style rules; daily summaries for TIR decay-style rules | Matches Appendix C default and keeps pattern rules deterministic without making every summary rule depend on raw stream storage. |

## Residual

The local P5 rail can prove source registration, canonical unit enforcement, FHIR provenance, non-diagnostic insight text, web/native gating, and the D4 PDC diabetes policy/calculation. Real P5 remains future work until native device sync, Dexcom OAuth/API, production pharmacy claims feeds, official value-set refresh/import controls, stream storage, and production FHIR writes exist.
