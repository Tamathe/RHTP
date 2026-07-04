# D4 PDC Adherence Gate Result

**Date:** 2026-07-04
**Command:** `npm run d4:gate`
**Proof rung:** local deterministic policy/calculation, no real PHI

```text
RHTP D4 PDC adherence gate
Cases: 7/7
- d4_policy_uses_pdc_dr_measurement_contract: pass (threshold=80;period=ipsd_to_measurement_year_end)
- d4_drug_grouping_matches_diabetes_all_class: pass (biguanide,sulfonylurea,thiazolidinedione,dpp4_inhibitor,gip_glp1_receptor_agonist,meglitinide,sglt2_inhibitor)
- d4_same_drug_overlap_carries_forward: pass (coveredDays=60;secondStart=2026-01-31)
- d4_pdc_threshold_passes_at_80_percent: pass (pdc=82.19;covered=300/365)
- d4_below_threshold_emits_refill_gap: pass (pdc=68.49;event=insight.med.refill_gap)
- d4_unknown_and_insulin_claims_not_counted: pass (review=1;excluded=1)
- d4_claims_floor_not_device_enhancement: pass (source=pharmacy_fill_claim;derived=med_pdc_daily)
```

## Interpretation

- The local `pdc_diabetes` policy follows the public CMS/PQA PDC-DR shape used in the 2026 QRS technical specifications.
- The denominator is the treatment period from IPSD to measurement-year end, disenrollment, or death.
- The local class grouping includes diabetes all-class tables BG, SFU, TZD, DPP4, GIP/GLP1, MEG, and SGLT2.
- Same-target-drug overlap carries forward instead of double-counting.
- Insulin claims are exclusion evidence; unknown diabetes medication names route to review instead of silently counting.
- Claims-PDC emits `insight.med.refill_gap` from `pharmacy_fill_claim`; bottle/device adherence remains a separate enhancement path.

## Residual

This closes D4 as a local operating decision and deterministic gate. Production still requires live pharmacy claims feeds, official value-set refresh/import controls, production FHIR writes for `med_pdc_daily`, and measure-owner sign-off before reporting live `pdc_diabetes` outcomes.
