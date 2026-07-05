# Appendix B Residual Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local gate that proves Appendix B residuals from the production spec are tracked as demo-safe, production-only, or locally verified work instead of loose prose.

**Architecture:** Keep `docs/ops/rhtp-release-ledger.json` as the source of truth. Add a `specResiduals` ledger section for Appendix B.3, B.4, and B.6, and add a `spec:gate` command that verifies B.5 demo workstreams, required residual coverage, no-PHI demo scoping, and production-only status for unfinished work.

**Tech Stack:** TypeScript, Vitest, tsx, existing npm gate pattern.

## Global Constraints

- The stakeholder prototype must remain no-PHI and use synthetic/local seed data only.
- `RHTP_REAL_PHI` must stay off for all local release gates.
- Public preview verification stays out of `release:gate` until a deployed URL and deployment id exist.
- Do not push unless explicitly requested.

---

### Task 1: Spec Residual Gate

**Files:**
- Create: `server/spec-residual-gate.ts`
- Create: `server/spec-residual-gate.test.ts`
- Create: `scripts/rhtp-spec-residual-gate.ts`
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: `docs/ops/rhtp-release-ledger.json` with `workstreams`, `blockers`, `prototypeScope`, and new `specResiduals`.
- Produces: `runSpecResidualGate(): SpecResidualGateReport`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { runSpecResidualGate } from './spec-residual-gate'

describe('spec residual gate', () => {
  it('tracks Appendix B residuals without turning production-only items into demo blockers', () => {
    const report = runSpecResidualGate()

    expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'appendix_b3_medium_residuals_tracked',
      'appendix_b4_cross_cutting_subsystems_tracked',
      'appendix_b5_named_capabilities_have_demo_paths',
      'appendix_b6_right_to_erasure_tracked',
      'production_residuals_are_not_demo_blockers',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/spec-residual-gate.test.ts`

Expected: FAIL because `server/spec-residual-gate.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function runSpecResidualGate(): SpecResidualGateReport {
  // Read the ledger import, check the required Appendix B residual IDs, and summarize pass/fail cases.
}
```

- [ ] **Step 4: Add ledger residuals and script wiring**

Add `specResiduals` entries for Appendix B.3 medium controls, Appendix B.4 cross-cutting production subsystems, and Appendix B.6 right-to-erasure. Add `spec:gate` to `package.json`.

- [ ] **Step 5: Verify**

Run:

```powershell
npx vitest run server/spec-residual-gate.test.ts
npm run spec:gate
```

Expected: PASS, with five spec residual cases passing.

### Task 2: Release Gate Wiring

**Files:**
- Modify: `server/local-release-gate.ts`
- Modify: `server/local-release-gate.test.ts`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Modify: `docs/ops/red-team-results/2026-07-04-local-release-gate.md`
- Modify: `docs/ops/rhtp-release-ledger.json`

**Interfaces:**
- Consumes: `spec:gate`.
- Produces: local release proof that includes the Appendix B residual gate.

- [ ] **Step 1: Write the failing local release test update**

```ts
expect(localReleaseGateCommands).toContainEqual({ id: 'spec_residual_gate', script: 'spec:gate' })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/local-release-gate.test.ts`

Expected: FAIL because `spec:gate` is not in `localReleaseGateCommands`.

- [ ] **Step 3: Wire the gate**

Add `{ id: 'spec_residual_gate', script: 'spec:gate' }` before `preview_gate`.

- [ ] **Step 4: Verify**

Run:

```powershell
npx vitest run server/spec-residual-gate.test.ts server/local-release-gate.test.ts
npm run release:gate
```

Expected: PASS, with release commands incremented by one.
