# Coverage Logistics Gate Result

**Date:** 2026-07-05
**Command:** `npm run coverage:gate`
**Proof rung:** local no-PHI coverage and logistics demo evidence

```text
RHTP coverage logistics gate
Cases: 5/5
- coverage_options_are_synthetic_no_phi: pass (options=2;synthetic=2)
- coverage_options_link_to_sites: pass (linked=2)
- ride_resources_resolve_to_kentucky_directory: pass (rideResources=1)
- coverage_requires_navigator_confirmation: pass (navigatorRequired=2)
- real_adjudication_and_booking_stay_blocked: pass (real adjudication and ride booking blocked)
```

## Interpretation

- Coverage and ride options are synthetic and contain no patient data.
- Options link to seeded screening sites.
- Ride help resolves to the Kentucky SDOH resource directory.
- Navigator confirmation is required before any stakeholder-demo coverage or ride guidance is treated as actionable.
- Real coverage adjudication and real ride booking remain blocked.

## Residual

This does not prove payer eligibility, claim adjudication, non-emergency medical transportation booking, production directory freshness, or real patient data use.
