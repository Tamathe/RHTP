# H2 Async Access Gate Result

**Date:** 2026-07-04
**Command:** `npm run async:gate`
**Proof rung:** local demo backend, no real PHI

```text
RHTP H2 async access gate
Cases: 6/6
- gateway_minted_patient_pack_token: pass (allowed, auditRecorded=true)
- matching_scope_context_read_allowed: pass (allowed, auditRecorded=true)
- cross_patient_read_blocked: pass (blocked, patient_scope_mismatch, auditRecorded=true)
- cross_pack_read_blocked: pass (blocked, pack_scope_mismatch, auditRecorded=true)
- expired_token_blocked: pass (blocked, token_expired, auditRecorded=true)
- revoked_token_blocked: pass (blocked, token_revoked, auditRecorded=true)
Standing broad async grant: blocked
```

## Interpretation

- The local gateway mints a bearer token once and stores only its hash.
- The token is scoped to one patient and concrete pack ids; wildcard broad grants are rejected.
- Matching async context reads are allowed and audited.
- Cross-patient, cross-pack, expired, and revoked reads are blocked and audited.
- This does not close H2 for a real-PHI pilot. Production consent repository claims and database RLS policies still need to enforce the same contract.
