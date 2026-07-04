# RHTP D2 Adolescent Consent Decision

**Date:** 2026-07-04
**Proof rung:** local operating decision, no real PHI
**Source spec:** `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`
**Gate:** `npm run d2:gate`

## Local Operating Decision

The local adolescent-confidentiality model for PHQ/GAD and SDOH packs is pinned to Kentucky-specific rules:

| Area | Local rule |
|---|---|
| PHQ/GAD outpatient mental-health screen by physician | Minor age 16 or older may self-consent. Result is adolescent-confidential and suppressed from guardian proxy by default. |
| PHQ/GAD by qualified mental-health professional | Minor age 16 or older must be an unaccompanied youth, and the workflow must record the reasonable attempt to obtain guardian consent or verify age/status. Missing verification routes to legal review. |
| Under-16 PHQ/GAD without guardian consent | Fails closed before collection and remains AI/proxy suppressed. |
| Substance-use assessment/care | Minor self-consent is allowed and treated as `part2_sud`/adolescent-confidential for proxy purposes. |
| STI, contraception, pregnancy, childbirth | Minor self-consent is allowed and treated as reproductive/HIV-sensitive for proxy purposes. |
| General SDOH screen with guardian consent | Allowed without adolescent-confidential proxy suppression unless a sensitive response category is present. |
| Guardian proxy disclosure | Blocked by default for minor-consented confidential services. A clinician may record a health-benefit override for parent/guardian notice. |

## Sources Used

- Kentucky KRS 214.185: minor consent for venereal disease, pregnancy, substance use disorder, contraception, pregnancy, childbirth, age-16 outpatient mental-health counseling, emergency care, and clinician health-benefit parent notice.
- Kentucky KRS 222.441: minor capacity to consent to substance-use-related medical care or counseling.
- HHS HIPAA personal-representative guidance: parent/guardian is generally the personal representative, but not for the PHI tied to care the minor may lawfully consent to without parent consent.

## Residual

This closes D2 as a local operating decision. Production still requires Kentucky counsel and clinical owner sign-off, plus consent repository, proxy-portal, RBAC/RLS, audit, and segmented-storage enforcement before PHQ/GAD or adolescent-sensitive SDOH use with real PHI.
