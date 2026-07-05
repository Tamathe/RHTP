# Coverage Logistics Demo Gate Plan

## Goal

Show the stakeholder-facing coverage, low-cost site, and ride-support journey without implying real eligibility verification, claim adjudication, or ride booking.

## Scope

- Add synthetic coverage/logistics options to the seed state.
- Display coverage and ride context beside screening-site choices.
- Add deterministic helpers and a local gate proving the options are no-PHI, synthetic, navigator-confirmed, and blocked from real booking/adjudication.
- Wire the gate into the local no-PHI release proof.

## Out of Scope

- Real payer eligibility checks.
- Real coverage adjudication.
- Real non-emergency medical transportation booking.
- Real patient data, claims, device data, or PHI.

## Proof

- `npx vitest run src/lib/coverage-logistics.test.ts src/components/FindScreeningScreen.test.tsx server/coverage-logistics-gate.test.ts server/local-release-gate.test.ts`
- `npm run coverage:gate`
- `npm run release:gate`
