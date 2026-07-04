# RHTP H4 Break-Glass Consent Gate Plan

**Date:** 2026-07-04
**Proof rung:** local demo backend, no real PHI
**Source spec:** `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`

## Goal

Build the local H4 control so break-glass access cannot be confused with Part 2 consent. The rail must create a request, require approval, enforce a short TTL, require post-hoc review, and refuse Part 2 segmented access unless purpose-specific Part 2 consent exists.

## Scope

- Add a break-glass access record to local backend state.
- Add request, approval, segmented-read, expiry, and post-hoc-review functions.
- Require purpose-specific consent for `part2_sud` segmented reads.
- Fail closed for adolescent-confidential access until the Kentucky minor-consent/proxy-disclosure policy decision is approved.
- Add `npm run h4:gate` to prove the local control.

## Non-Scope

- No real legal determination for Kentucky adolescent consent.
- No production consent repository.
- No production RBAC/RLS enforcement.
- No real segmented FHIR partition.
- No real-PHI deployment.

## Acceptance

- `npm run h4:gate` reports 5/5 cases passing.
- Part 2 break-glass approval without purpose-specific Part 2 consent is blocked.
- Approved access has a TTL.
- Expired access returns no segmented facts.
- Post-hoc review is recorded.
- Adolescent-confidential access fails closed until D2 is legally/policy approved.
