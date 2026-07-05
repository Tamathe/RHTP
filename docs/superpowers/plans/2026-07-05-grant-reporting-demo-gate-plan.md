# Grant Reporting Demo Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define and verify a synthetic no-PHI RHTP grant-reporting packet so stakeholders can see the report format, cadence, recipient, linked outcome metrics, equity alarms, and billing evidence.

**Architecture:** Add a small typed data model to the existing seed state, a pure summary/safety helper in `src/lib`, a Program outcomes UI section, and a server-side gate that validates the packet against seeded metric/equity/billing evidence. The release ledger and local release gate become the operational source of truth.

**Tech Stack:** TypeScript strict mode, React, Zustand seed state, Vitest, npm script gates.

## Global Constraints

- First version is a stakeholder demonstration prototype and must not touch real patient data.
- Keep `RHTP_REAL_PHI` off or unset.
- Use synthetic seed data, local demo state, and approved generic no-PHI content only.
- Do not submit claims, deliver reports to real recipients, or claim public deployment from local proof.
- Stop at local commit unless push/deploy is explicitly requested.

---

### Task 1: Grant Report Types, Seed Data, and Library

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/seed.ts`
- Create: `src/lib/grant-reporting.ts`
- Create: `src/lib/grant-reporting.test.ts`
- Modify: `server/state.ts`

**Interfaces:**
- Produces: `GrantReportPacket`, `GrantReportMetricLine`, `GrantReportCadence`, `GrantReportRecipientType`
- Produces: `grantReportIsPrototypeSafe(report: GrantReportPacket): boolean`
- Produces: `summarizeGrantReport(report: GrantReportPacket): GrantReportSummary`
- Produces: `SeedState.grantReportPackets: GrantReportPacket[]`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { seed } from '../data/seed'
import { grantReportIsPrototypeSafe, summarizeGrantReport } from './grant-reporting'

describe('grant reporting helpers', () => {
  it('summarizes a synthetic no-PHI stakeholder grant report packet', () => {
    const report = seed.grantReportPackets[0]

    expect(grantReportIsPrototypeSafe(report)).toBe(true)
    expect(report.title).toBe('RHTP stakeholder grant report')
    expect(report.patientDataIncluded).toBe(false)
    expect(report.recipient).toBe('RHTP stakeholder review')
    expect(report.cadence).toBe('monthly')
    expect(summarizeGrantReport(report)).toEqual({
      billingEvidenceCount: 4,
      deliveryBlocked: true,
      equityAlarmCount: 1,
      metricCount: 4,
      suppressedRows: 1,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/grant-reporting.test.ts`
Expected: FAIL because the module and seed packet do not exist.

- [ ] **Step 3: Write minimal implementation**

Add `GrantReportPacket` types, seed `grantReportPackets`, normalize legacy file state with `grantReportPackets ?? []`, and implement the two helper functions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/grant-reporting.test.ts`
Expected: PASS.

### Task 2: Program Outcomes UI Section

**Files:**
- Modify: `src/components/ProgramOutcomesView.test.tsx`
- Modify: `src/components/hub/ProgramOutcomesView.tsx`

**Interfaces:**
- Consumes: `useStore((state) => state.grantReportPackets)`
- Consumes: `summarizeGrantReport(report)`
- Produces: UI text `Grant report packet`, `Synthetic no-PHI report packet`, `RHTP stakeholder review`, and `Delivery remains blocked`

- [ ] **Step 1: Write the failing test**

```ts
it('shows the synthetic no-PHI grant report packet', () => {
  render(<ProgramOutcomesView />)

  expect(screen.getByText(/Grant report packet/i)).toBeInTheDocument()
  expect(screen.getByText(/Synthetic no-PHI report packet/i)).toBeInTheDocument()
  expect(screen.getByText(/RHTP stakeholder review/i)).toBeInTheDocument()
  expect(screen.getByText(/Delivery remains blocked/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ProgramOutcomesView.test.tsx`
Expected: FAIL because the section is absent.

- [ ] **Step 3: Write minimal implementation**

Render the first report packet below the equity section with period, cadence, recipient, metric count, suppressed row count, and blockers.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ProgramOutcomesView.test.tsx`
Expected: PASS.

### Task 3: Local Grant Reporting Gate

**Files:**
- Create: `server/grant-reporting-gate.ts`
- Create: `server/grant-reporting-gate.test.ts`
- Create: `scripts/rhtp-grant-reporting-gate.ts`
- Modify: `package.json`
- Modify: `server/local-release-gate.ts`
- Modify: `server/local-release-gate.test.ts`

**Interfaces:**
- Produces: `runGrantReportingGate(): GrantReportingGateReport`
- Produces npm script `grant:gate`
- Adds `{ id: 'grant_gate', script: 'grant:gate' }` before `preview_gate`

- [ ] **Step 1: Write failing gate and release tests**

```ts
expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
expect(report.cases.map((testCase) => testCase.id)).toEqual([
  'grant_report_is_synthetic_no_phi',
  'grant_report_has_recipient_cadence_and_period',
  'grant_report_metric_lines_have_sources',
  'grant_report_links_equity_and_billing_evidence',
  'grant_report_delivery_stays_blocked',
])
```

Also expect `packageJson.scripts['grant:gate']` and a `grant_gate` release command.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run server/grant-reporting-gate.test.ts server/local-release-gate.test.ts`
Expected: FAIL because the gate and script do not exist.

- [ ] **Step 3: Write minimal implementation**

Validate that the report is synthetic/no-PHI, has recipient/cadence/period, every metric line references seeded metric snapshots, equity/billing references resolve, and delivery remains blocked by `prototype_no_real_reporting_export` plus `no_recipient_delivery`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run server/grant-reporting-gate.test.ts server/local-release-gate.test.ts`
Expected: PASS.

### Task 4: Ledger, Docs, and Final Verification

**Files:**
- Create: `docs/ops/red-team-results/2026-07-05-grant-reporting-gate.md`
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Modify: `docs/ops/RHTP-REAL-PHI-GATES.md`
- Modify: `docs/ops/red-team-results/2026-07-04-local-release-gate.md`

**Interfaces:**
- Adds release command count `19/19`
- Adds workstream `grant_reporting_demo_gate`
- Keeps real recipient delivery, real payer reporting, public exports, and real patient data out of scope

- [ ] **Step 1: Update docs and ledger**

Record `npm run grant:gate`, five passing cases, local no-PHI proof, and production/report-recipient exclusions.

- [ ] **Step 2: Run focused verification**

Run:

```powershell
npx vitest run src/lib/grant-reporting.test.ts src/components/ProgramOutcomesView.test.tsx server/grant-reporting-gate.test.ts server/local-release-gate.test.ts
npm run grant:gate
npm run release:gate
git diff --check
```

Expected: all commands exit 0, local release reports `Commands: 19/19`.

- [ ] **Step 3: Commit**

```powershell
git add src/types.ts src/data/seed.ts src/lib/grant-reporting.ts src/lib/grant-reporting.test.ts src/components/hub/ProgramOutcomesView.tsx src/components/ProgramOutcomesView.test.tsx server/grant-reporting-gate.ts server/grant-reporting-gate.test.ts scripts/rhtp-grant-reporting-gate.ts package.json server/local-release-gate.ts server/local-release-gate.test.ts server/state.ts docs/ops/red-team-results/2026-07-05-grant-reporting-gate.md docs/ops/rhtp-release-ledger.json docs/ops/RHTP-DEPLOYMENT-CONTROL.md docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md docs/ops/RHTP-REAL-PHI-GATES.md docs/ops/red-team-results/2026-07-04-local-release-gate.md docs/superpowers/plans/2026-07-05-grant-reporting-demo-gate-plan.md
git commit -m "feat: add grant reporting demo gate"
```
