# Task 8 Report: Update Cross-Surface Golden Path

## Scope
- Updated `src/components/SideBySide.test.tsx` to reflect the new voice-first barrier flow and navigator queue defaults.
- Replaced `src/golden-path.test.tsx` with the new P0 voice-to-queue-to-schedule journey.
- Preserved existing seed-based, no-backend simulation behavior and no production integrations.

## Changes made
1. `src/components/SideBySide.test.tsx`
   - Replaced first test with:
     - `it('a voice-reported barrier appears in the navigator queue', ...)`
     - New actions: `start voice outreach` then `I need a ride`
     - Assertions: navigator queue shows transportation barrier + help/resolve prompt
   - Added second test:
     - `it('a voice red flag appears as urgent navigator work', ...)`
     - New actions: `start voice outreach` then `sudden vision changes`
     - Assertions: red-flag symptom appears and urgent work exists
   - Kept reset demo test unchanged.

2. `src/golden-path.test.tsx`
   - Replaced legacy overdue-to-closed-loop test with new P0 production-shaped journey test:
     - Start voice outreach
     - Report transportation barrier
     - Verify navigator queue reason is `transportation_barrier`
     - Navigate to Find screen, pick FQHC mobile site
     - Confirm plan
     - Verify hero gap status scheduled and `scheduled` metric increments to `6`

## TDD evidence
- **RED**: Initial run of cross-surface tests failed.
  - `npm test -- src/components/SideBySide.test.tsx src/golden-path.test.tsx`
  - Failure: `a voice red flag appears as urgent navigator work`
  - Root cause: `screen.getByText(/urgent/i)` matched multiple elements.
- **GREEN**: Adjusted assertion to target presence of an urgent match deterministically.
- **PASS (cross-surface tests)**:
  - `npm test -- src/components/SideBySide.test.tsx src/golden-path.test.tsx`
  - Result: `Test Files  2 passed (2), Tests 4 passed (4)`
- **PASS (full suite)**:
  - `npm test`
  - Result: `Test Files  27 passed (27), Tests 88 passed (88)`

## Commit
- Commit message: `test: cover P0 voice-to-queue journey`
- Files committed:
  - `src/components/SideBySide.test.tsx`
  - `src/golden-path.test.tsx`
