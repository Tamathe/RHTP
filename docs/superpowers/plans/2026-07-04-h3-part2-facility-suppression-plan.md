# H3 Part 2 Facility Suppression Plan

## Goal

Build a local, production-shaped H3 control that prevents Part 2 facility identity from leaking through source facts, navigator work, patient context, audit text, or route responses.

## Scope

- Add a deterministic HIE discharge suppression rail.
- Suppress sensitive facility names and sensitive discharge dispositions into generic restricted evidence.
- Fail closed on unrecognized discharge dispositions by routing generic segmented-data review.
- Add a local HIE discharge ingest endpoint using the same suppression rail.
- Add `npm run part2:gate` as the operator proof command.
- Update the real-PHI gate docs and release ledger without claiming production Part 2 compliance is closed.

## Acceptance

- Sensitive facility/category text never appears in emitted source facts, navigator queue text, audit details, or route responses.
- Unrecognized dispositions do not create source facts and create segmented-data review work.
- Recognized non-sensitive discharges can ingest normally.
- H3 is recorded as local-control-verified only; real-PHI remains blocked until production HIE/FHIR adapters, storage policies, and outbound surfaces enforce the same suppression.
