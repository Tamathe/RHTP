# Navigator Enrollment Gate Result

**Date:** 2026-07-05
**Command:** `npm run enrollment:gate`
**Proof rung:** local no-PHI navigator-attested enrollment demo evidence

```text
RHTP navigator enrollment gate
Cases: 5/5
- navigator_enrollment_is_synthetic_no_phi: pass (synthetic=true;patientData=false)
- navigator_enrollment_links_proofed_in_person_identity: pass (proofing=proofed_in_person)
- navigator_enrollment_is_offline_capable: pass (offline=true;steps=4)
- navigator_enrollment_trust_transfer_ready: pass (ready_for_patient_login)
- real_identity_proofing_and_account_creation_stay_blocked: pass (blockers=prototype_no_real_identity_proofing,prototype_no_account_creation)
```

## Interpretation

- The enrollment session is synthetic and includes no patient data.
- The enrollment links to a demo `proofed_in_person` identity row.
- The intake checklist is complete and marked offline-capable for rural/waiting-room use.
- Trust transfer is ready as a demo patient-login handoff.
- Real identity proofing and real account creation remain blocked.

## Residual

This does not prove production identity proofing, credential issuance, account creation, legal identity validation, offline sync conflict handling, RBAC/RLS, or real patient data use.
