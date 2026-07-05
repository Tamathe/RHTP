# Equity Metrics Demo Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a no-PHI local equity-metrics demo lane so stakeholders can see metric snapshots, small-cell suppression, and program-level disparity alarms without claiming real de-identification or production analytics readiness.

**Architecture:** Add typed synthetic metric snapshots and equity alarms to the seed state, implement a pure projection in `src/lib/equity-metrics.ts`, show the projection in `ProgramOutcomesView`, and add an `equity:gate` command to the local no-PHI release proof. The gate proves that snapshots are synthetic aggregate rows, small cells are suppressed before display, device-owner disparity creates a program-review alarm, and device-owner metrics require a claims floor.

**Tech Stack:** TypeScript, React, Zustand seed state, Vitest, existing `tsx` gate-script pattern.

## Global Constraints

- No real PHI: equity rows are synthetic aggregate demo data only and must not include patient IDs.
- No published de-identification claim: the prototype may show the suppression behavior, but real expert-determination review remains out of scope.
- Rules decide: suppression and disparity alarms are deterministic calculations, not model output.
- Equity outputs are assistive only: they may create program-review evidence, but must not prioritize or deprioritize individual patient care.
- Real production metric pipelines, research export, payer reporting, and public equity publishing remain out of scope.

---

### Task 1: Equity Metric Model

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/seed.ts`
- Create: `src/lib/equity-metrics.ts`
- Create: `src/lib/equity-metrics.test.ts`

**Interfaces:**
- Produces: `MetricSnapshotRow`, `EquityMetricStage`, `EquityAlarm`, `projectEquitySnapshots`, `detectEquityAlarms`, and `validateClaimsFloorForDeviceMetric`.

- [x] **Step 1: Write failing equity projection tests**

Create `src/lib/equity-metrics.test.ts` with tests that:

```ts
expect(projectEquitySnapshots(rows).visible.every((row) => !row.suppressed)).toBe(true)
expect(projectEquitySnapshots(rows).suppressed.map((row) => row.id)).toContain('metric_small_cell')
expect(detectEquityAlarms(rows)).toEqual([
  expect.objectContaining({
    metricId: 'pdc_diabetes',
    stage: 'outcome_rate',
    stratum: 'device_owner',
    disparityRatio: 0.4,
    threshold: 0.8,
    claimsFloorPresent: true,
  }),
])
expect(validateClaimsFloorForDeviceMetric({ metricId: 'pdc_diabetes', stratum: 'device_owner', claimsFloorPresent: false }).ok).toBe(false)
```

Run: `npm test -- src/lib/equity-metrics.test.ts`

Expected: FAIL because `src/lib/equity-metrics.ts` does not exist.

- [x] **Step 2: Implement model and seed snapshots**

Add aggregate-only types:

```ts
export type MetricSnapshotScope = 'cohort' | 'county' | 'language' | 'demographic' | 'device_owner'
export type EquityMetricStage = 'insight_rate' | 'outreach_rate' | 'engagement_rate' | 'outcome_rate' | 'gap_closure_rate'

export interface MetricSnapshotRow {
  id: string
  metricId: string
  packId: string
  stage: EquityMetricStage
  scope: MetricSnapshotScope
  stratum?: string
  value: number
  denominator: number
  capturedAt: string
  synthetic: boolean
  suppressed?: boolean
  suppressionReason?: string
  claimsFloorPresent?: boolean
}

export interface EquityAlarm {
  id: string
  metricId: string
  packId: string
  stage: EquityMetricStage
  stratum: MetricSnapshotScope
  disparityRatio: number
  threshold: number
  claimsFloorPresent: boolean
  sourceSnapshotIds: string[]
  programReviewOnly: boolean
  synthetic: boolean
}
```

Add `metricSnapshots` and `equityAlarms` to `SeedState`. Seed synthetic aggregate rows for `eye_exam`, `bp_control`, `pdc_diabetes`, and `transitional_care`, including one denominator `< 11` row and one device-owner disparity.

Implement:

```ts
export const SMALL_CELL_SUPPRESSION_THRESHOLD = 11
export const EQUITY_DISPARITY_THRESHOLD = 0.8
export function projectEquitySnapshots(rows: MetricSnapshotRow[]): EquitySnapshotProjection
export function detectEquityAlarms(rows: MetricSnapshotRow[]): EquityAlarm[]
export function validateClaimsFloorForDeviceMetric(input: ClaimsFloorValidationInput): ClaimsFloorValidationResult
```

- [x] **Step 3: Verify green**

Run: `npm test -- src/lib/equity-metrics.test.ts`

Expected: PASS.

### Task 2: Program Outcomes Equity View

**Files:**
- Modify: `src/components/hub/ProgramOutcomesView.tsx`
- Modify: `src/components/ProgramOutcomesView.test.tsx`

**Interfaces:**
- Consumes: `useStore().metricSnapshots`, `useStore().equityAlarms`, `projectEquitySnapshots`, and `detectEquityAlarms`.
- Produces: visible synthetic equity dashboard section inside Program outcomes.

- [x] **Step 1: Write failing view tests**

Extend `src/components/ProgramOutcomesView.test.tsx` to assert:

```ts
expect(screen.getByText(/Equity snapshot/i)).toBeInTheDocument()
expect(screen.getByText(/Small cells suppressed before display/i)).toBeInTheDocument()
expect(screen.getByText(/Program review alert/i)).toBeInTheDocument()
expect(screen.getByText(/Synthetic aggregate demo data/i)).toBeInTheDocument()
```

Run: `npm test -- src/components/ProgramOutcomesView.test.tsx`

Expected: FAIL because the equity section is not rendered yet.

- [x] **Step 2: Implement equity section**

Render:
- existing metric cards unchanged;
- a compact "Equity snapshot" section that lists visible aggregate snapshots by stage/scope;
- a suppression note with the count of suppressed rows;
- a "Program review alert" card for the deterministic disparity alarm;
- no patient identifiers.

- [x] **Step 3: Verify green**

Run: `npm test -- src/components/ProgramOutcomesView.test.tsx`

Expected: PASS.

### Task 3: Equity Gate, Ledger, and Release Proof

**Files:**
- Create: `server/equity-metrics-gate.ts`
- Create: `server/equity-metrics-gate.test.ts`
- Create: `scripts/rhtp-equity-metrics-gate.ts`
- Modify: `package.json`
- Modify: `server/local-release-gate.ts`
- Modify: `server/local-release-gate.test.ts`
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Modify: `docs/ops/RHTP-REAL-PHI-GATES.md`
- Modify: `docs/ops/red-team-results/2026-07-04-local-release-gate.md`
- Create: `docs/ops/red-team-results/2026-07-05-equity-metrics-gate.md`

**Interfaces:**
- Produces: `runEquityMetricsGate()` and `npm run equity:gate`.

- [x] **Step 1: Write failing gate tests**

Create `server/equity-metrics-gate.test.ts` expecting case ids:

```ts
[
  'equity_snapshots_are_synthetic_aggregate_rows',
  'outcome_metrics_have_stratified_snapshots',
  'small_cells_suppressed_at_projection',
  'device_owner_disparity_raises_program_alarm',
  'device_metric_requires_claims_floor',
  'equity_outputs_are_program_review_only',
]
```

Update `server/local-release-gate.test.ts` to include `{ id: 'equity_gate', script: 'equity:gate' }` before `billing_gate`.

Run: `npm test -- server/equity-metrics-gate.test.ts server/local-release-gate.test.ts`

Expected: FAIL because the equity gate and npm script do not exist.

- [x] **Step 2: Implement gate and script**

Gate cases:
- all rows are synthetic aggregate rows with no patient id field;
- every pack outcome metric has at least one matching visible or suppressed snapshot;
- small-cell rows are suppressed by `projectEquitySnapshots`;
- the synthetic device-owner disparity creates exactly one program-review alarm;
- a device-owner metric without claims floor fails validation;
- alarms are `programReviewOnly` and do not point to a patient.

- [x] **Step 3: Update docs and ledger**

Record the slice as local no-PHI demo evidence only. Update release command counts from `17/17` to `18/18` after adding `equity:gate`.

- [x] **Step 4: Final verification**

Run:

```powershell
npm run equity:gate
npm test -- src/lib/equity-metrics.test.ts src/components/ProgramOutcomesView.test.tsx server/equity-metrics-gate.test.ts server/local-release-gate.test.ts
npm run release:gate
git diff --check
```

Expected: all commands exit 0; local release gate includes `equity:gate`.

- [x] **Step 5: Commit**

```powershell
git add src/types.ts src/data/seed.ts src/lib/equity-metrics.ts src/lib/equity-metrics.test.ts src/components/hub/ProgramOutcomesView.tsx src/components/ProgramOutcomesView.test.tsx server/equity-metrics-gate.ts server/equity-metrics-gate.test.ts scripts/rhtp-equity-metrics-gate.ts package.json server/local-release-gate.ts server/local-release-gate.test.ts docs/ops/rhtp-release-ledger.json docs/ops/RHTP-DEPLOYMENT-CONTROL.md docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md docs/ops/RHTP-REAL-PHI-GATES.md docs/ops/red-team-results/2026-07-04-local-release-gate.md docs/ops/red-team-results/2026-07-05-equity-metrics-gate.md docs/superpowers/plans/2026-07-05-equity-metrics-demo-gate-plan.md
git commit -m "feat: add equity metrics demo gate"
```
