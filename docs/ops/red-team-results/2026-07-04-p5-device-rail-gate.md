# P5 Device Rail Gate Result

**Date:** 2026-07-04
**Command:** `npm run p5:gate`
**Proof rung:** local demo backend, no real PHI

```text
RHTP P5 device rail gate
Cases: 6/6
- p5_device_source_registry_present: pass (deviceSources=healthkit_health_connect,dexcom_api)
- canonical_units_required: pass (unit_blocked)
- fhir_device_provenance_lands: pass (accepted)
- non_diagnostic_insight_only: pass (insight.glucose.cgm_high_review)
- unsafe_device_action_blocked: pass (action_blocked)
- web_runtime_native_sync_disabled: pass (healthkit=native_shell_required;dexcom=patient_oauth_supported)
```

## Interpretation

- The local seed registry now names the first P5 direct device sources and the claims-PDC floor source.
- Device readings are accepted only from registered device sources with active consent, canonical units, and FHIR references.
- Accepted readings land as `device` source facts with `patientConfirmed=false`.
- The first deterministic CGM insight remains a discuss-with-clinician pattern summary and does not diagnose, dose insulin, or change medication.
- Unsafe requested device actions are blocked before source facts are added.
- HealthKit and Health Connect remain disabled in web runtime; Dexcom patient OAuth can remain reachable before the native shell exists.

## Residual

This gate does not close P5 for real device use. Production still requires native shell work, HealthKit/Health Connect integration, Dexcom OAuth/API integration, pharmacy PDC calculation, stream storage, production FHIR store writes, and real-PHI deployment controls.
