# D2 Adolescent Consent Gate Result

**Date:** 2026-07-04
**Command:** `npm run d2:gate`
**Proof rung:** local deterministic policy, no real PHI

```text
RHTP D2 adolescent consent gate
Cases: 8/8
- d2_policy_sources_pinned: pass (sources=8;mentalHealthAge=16)
- d2_physician_phq_gad_age_16_self_consent: pass (minor_self_consent_allowed;category=adolescent)
- d2_qmhp_unaccompanied_verification_required: pass (legal_review_required;reason=unaccompanied_youth_verification_required)
- d2_under_16_phq_gad_fails_closed: pass (guardian_consent_required;reason=minor_age_below_kentucky_mental_health_self_consent_floor)
- d2_sud_minor_self_consent_proxy_suppressed: pass (minor_self_consent_allowed;proxy=minor_confidential_by_default)
- d2_proxy_blocks_minor_consented_confidential_result: pass (blocked;reason=minor_self_consented_confidential_service)
- d2_clinician_health_benefit_override_allows_parent_notice: pass (allowed;reason=clinician_health_benefit_override)
- d2_general_sdoh_guardian_proxy_allowed: pass (guardian_consent_allowed;proxy=allowed)
```

## Interpretation

- Kentucky source references are pinned in code.
- PHQ/GAD minor self-consent starts at age 16 for the physician path.
- The QMHP path requires age 16, unaccompanied-youth status, and a recorded reasonable attempt to obtain guardian consent or verify age/status.
- Under-16 PHQ/GAD without guardian consent fails closed before collection.
- Substance-use assessment/care is minor-consent capable and remains proxy-suppressed by default.
- Guardian proxy disclosure is blocked for minor-consented confidential results unless the minor authorizes disclosure or a clinician records the health-benefit parent-notice override.
- General SDOH screening with guardian consent remains proxy-visible unless a sensitive category is present.

## Residual

This gate does not authorize production PHQ/GAD or adolescent SDOH use with real PHI. Production still requires counsel/clinical owner sign-off, consent repository enforcement, proxy-portal suppression, RBAC/RLS, segmented storage, and audit review.
