# H5 SMS Disclosure Gate Plan

## Goal

Build a local, production-shaped H5 control that prevents condition names, sensitive categories, or model-personalized reason text from leaking through SMS bodies and lock-screen previews.

## Scope

- Add an approved SMS template renderer with deterministic slots.
- Add disclosure lint for condition, behavioral, SUD, reproductive, HIV, and interpersonal-safety wording.
- Block sensitive categories by category before linting.
- Add a local SMS render endpoint that records allowed/blocked audit events without echoing sensitive category names.
- Add `npm run sms:gate` as the operator proof command.
- Update the real-PHI gate docs and release ledger without claiming SMS outreach is production-ready.

## Acceptance

- Approved English and Spanish generic templates pass.
- Unknown templates and missing language bundles fail.
- Sensitive categories are blocked even when copy is generic.
- Unsafe slot values and condition-name text are blocked.
- H5 is recorded as local-control-verified only; SMS outreach remains blocked until A2P registration, opt-out handling, sender controls, and delivery telemetry are complete.
