# Prototype PHI Defer Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reclassify health-information and real-PHI gates as outside the stakeholder prototype so they no longer read as blockers for the demo stakeholders need to see.

**Architecture:** The release ledger remains the source of truth. The stakeholder demo gate verifies that the prototype is no-PHI and that health-information gates are deferred outside the prototype, while the status output and release packet use stakeholder-safe wording.

**Tech Stack:** TypeScript, Vitest, JSON release ledger, npm script gates.

## Global Constraints

- Keep `RHTP_REAL_PHI` off or unset for stakeholder demo proof.
- Use only synthetic seed data, local demo state, and approved generic no-PHI content.
- Do not claim public deployment, live alias routing, or real-PHI readiness from local proof.
- Do not push unless explicitly requested.

---

### Task 1: Stakeholder Demo Gate Wording

**Files:**
- Modify: `server/stakeholder-demo-gate.test.ts`
- Modify: `server/stakeholder-demo-gate.ts`
- Modify: `docs/ops/rhtp-release-ledger.json`

**Interfaces:**
- Consumes: `prototypeScope.deferUntil`
- Produces: `runStakeholderDemoGate()` with `stakeholder_demo_prototype_scope_defers_health_info_gates`

- [ ] **Step 1: Write the failing test**

```ts
expect(
  report.cases.find((testCase) => testCase.id === 'stakeholder_demo_prototype_scope_defers_health_info_gates'),
).toMatchObject({
  ok: true,
  detail: 'deferred outside stakeholder prototype: E2, H2, H3, H4, H5',
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/stakeholder-demo-gate.test.ts`
Expected: FAIL because the current detail says `deferred for real-PHI pilot`.

- [ ] **Step 3: Write minimal implementation**

Update the gate to require `scope.deferUntil === 'outside_stakeholder_prototype'` and render the new detail string.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/stakeholder-demo-gate.test.ts`
Expected: PASS.

### Task 2: Stakeholder Packet Scope Language

**Files:**
- Modify: `server/stakeholder-release-packet.test.ts`
- Modify: `server/stakeholder-release-packet.ts`
- Modify: `docs/ops/rhtp-release-ledger.json`

**Interfaces:**
- Consumes: `deployTargets[id=real_phi_pilot].status`
- Produces: `realPhiPilotStatus: 'not_in_prototype' | 'blocked' | 'unknown'`
- Produces: markdown line `- Prototype-deferred health-information gates: E2, H2, H3, H4, H5`

- [ ] **Step 1: Write the failing test**

```ts
expect(packet).toMatchObject({
  realPhiPilotStatus: 'not_in_prototype',
})
expect(packet.parkedRealPhiBlockers).toEqual(['E2', 'H2', 'H3', 'H4', 'H5'])
expect(markdown).toContain('- Real-PHI pilot: not in prototype scope')
expect(markdown).toContain('- Prototype-deferred health-information gates: E2, H2, H3, H4, H5')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/stakeholder-release-packet.test.ts`
Expected: FAIL because the packet still renders blocked/pilot blocker language.

- [ ] **Step 3: Write minimal implementation**

Return `not_in_prototype` when the real-PHI target status is `not_in_prototype`, format that value as `not in prototype scope`, and relabel the parked list in markdown.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/stakeholder-release-packet.test.ts`
Expected: PASS.

### Task 3: Ops Status Scope Language

**Files:**
- Modify: `scripts/rhtp-status.test.ts`
- Modify: `scripts/rhtp-status.ts`
- Modify: `docs/ops/rhtp-release-ledger.json`

**Interfaces:**
- Consumes: ledger phases, blockers, prototype scope, and deploy targets.
- Produces: status output that says PHI gates are not prototype blockers.

- [ ] **Step 1: Write the failing test**

```ts
expect(output).toContain('Prototype-deferred health-information gates (not demo blockers)')
expect(output).toContain('Health-info gates deferred outside stakeholder prototype: E2, H2, H3, H4, H5')
expect(output).toContain('Real-PHI pilot infrastructure: not_in_prototype | real-PHI | command: not part of stakeholder prototype')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/rhtp-status.test.ts`
Expected: FAIL because status still says parked real-PHI blockers and blocked pilot.

- [ ] **Step 3: Write minimal implementation**

Update the status labels and deploy target values from the ledger.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/rhtp-status.test.ts`
Expected: PASS.

### Task 4: Docs, Ledger, and Verification

**Files:**
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Modify: `docs/ops/RHTP-REAL-PHI-GATES.md`
- Modify: `docs/ops/red-team-results/2026-07-04-stakeholder-demo-readiness.md`
- Modify: `docs/ops/red-team-results/2026-07-04-static-preview-smoke.md`
- Modify: `docs/ops/rhtp-release-ledger.json`

**Interfaces:**
- Consumes: updated status and gate wording.
- Produces: no-PHI stakeholder prototype documentation with real-PHI work marked outside v1 scope.

- [ ] **Step 1: Update docs**

Replace demo-facing `real-PHI pilot blocked` wording with `not in prototype scope` and keep the explicit no-real-data boundary.

- [ ] **Step 2: Run focused verification**

Run: `npx vitest run server/stakeholder-demo-gate.test.ts server/stakeholder-release-packet.test.ts scripts/rhtp-status.test.ts`
Expected: PASS.

- [ ] **Step 3: Run release verification**

Run: `npm run release:gate`
Expected: PASS with `Validation: 3/3`, all local commands complete, stakeholder demo cases pass, and full tests pass.

- [ ] **Step 4: Check diff hygiene**

Run: `git diff --check`
Expected: no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-07-05-prototype-phi-defer-plan.md server/stakeholder-demo-gate.ts server/stakeholder-demo-gate.test.ts server/stakeholder-release-packet.ts server/stakeholder-release-packet.test.ts scripts/rhtp-status.ts scripts/rhtp-status.test.ts docs/ops/rhtp-release-ledger.json docs/ops/RHTP-DEPLOYMENT-CONTROL.md docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md docs/ops/RHTP-REAL-PHI-GATES.md docs/ops/red-team-results/2026-07-04-stakeholder-demo-readiness.md docs/ops/red-team-results/2026-07-04-static-preview-smoke.md
git commit -m "chore: reclassify phi gates for prototype"
```
