# H4 Break-Glass Consent Gate Result

**Date:** 2026-07-04
**Command:** `npm run h4:gate`
**Proof rung:** local demo backend, no real PHI

```text
RHTP H4 break-glass gate
Cases: 7/7
- part2_break_glass_requires_purpose_consent: pass (part2_consent_required)
- approved_break_glass_has_ttl: pass (active;expiresAt=2026-07-04T09:30:00)
- expired_break_glass_read_blocked: pass (expired)
- post_hoc_review_recorded: pass (reviewed)
- adolescent_break_glass_requires_purpose_consent: pass (part2_consent_required)
- adolescent_guardian_proxy_blocked: pass (guardian_proxy_blocked)
- adolescent_break_glass_category_match_required: pass (category_mismatch)
```

## Interpretation

- Break-glass access is request/approval based.
- Approved access is time-limited.
- Expired access returns no segmented facts.
- Post-hoc review is mandatory and audited.
- Part 2 segmented data still requires purpose-specific Part 2 consent; break-glass alone is not enough.
- Adolescent-confidential break-glass access requires purpose-specific adolescent consent.
- Guardian-linked accounts cannot retrieve adolescent-confidential facts through break-glass.
- Break-glass cannot relabel one segmented category as another; requested category must match every source fact.

## Residual

This does not close real-PHI H4. Production still requires a consent repository, segmented FHIR/storage enforcement, RBAC/RLS, production legal/clinical owner sign-off, and operational owner sign-off.
