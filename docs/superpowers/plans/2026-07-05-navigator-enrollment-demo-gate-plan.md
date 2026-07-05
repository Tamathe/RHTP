# Navigator Enrollment Demo Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-PHI stakeholder-demo path for navigator-attested in-person enrollment and trust transfer.

**Architecture:** Add synthetic navigator enrollment attestation records to seed state, show them in the navigator hub, and prove the boundary through a local gate. The gate verifies the rural in-person proofing story without claiming real identity proofing, real account creation, or production login.

**Tech Stack:** TypeScript, React, Zustand seed state, Vitest, local TSX gate scripts.

## Global Constraints

- Stakeholder prototype only: no real patient data, real identity proofing, real account creation, real login credential issuance, or real PHI.
- `RHTP_REAL_PHI` must remain off or unset.
- Enrollment records must be synthetic, navigator-attested, in-person, offline-capable, and linked to a `proofed_in_person` demo identity row.
- Trust transfer may be shown only as a demo handoff; production identity-proofing and account-creation controls remain blocked.

---

### Task 1: Seeded Enrollment Model

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/seed.ts`
- Modify: `server/state.ts`
- Create: `src/lib/navigator-enrollment.ts`
- Test: `src/lib/navigator-enrollment.test.ts`

**Interfaces:**
- Produces: `NavigatorEnrollmentSession`, `NavigatorEnrollmentStep`
- Produces: `navigatorEnrollmentIsPrototypeSafe(session: NavigatorEnrollmentSession): boolean`
- Produces: `findNavigatorEnrollmentForPatient(sessions: NavigatorEnrollmentSession[], patientId: string): NavigatorEnrollmentSession | undefined`

- [ ] **Step 1: Write failing helper tests**

Run: `npx vitest run src/lib/navigator-enrollment.test.ts`

Expected: fails because the helper and seed fields do not exist.

- [ ] **Step 2: Add the model and seed artifact**

Add one synthetic Ruth Ann enrollment session with `channel: 'in_person'`, `offlineCapable: true`, `proofingStatus: 'proofed_in_person'`, completed steps, and blockers for real identity proofing and account creation. Add a matching `PatientIdentity` row with `proofingStatus: 'proofed_in_person'`.

- [ ] **Step 3: Verify helper tests pass**

Run: `npx vitest run src/lib/navigator-enrollment.test.ts`

Expected: all tests pass.

### Task 2: Navigator Hub Surface

**Files:**
- Create: `src/components/hub/NavigatorEnrollmentView.tsx`
- Test: `src/components/hub/NavigatorEnrollmentView.test.tsx`
- Modify: `src/components/hub/HubShell.tsx`
- Modify: `src/components/hub/HubShell.test.tsx`

**Interfaces:**
- Consumes: `findNavigatorEnrollmentForPatient`
- Produces: an `Enrollment` hub view showing the attestation, offline intake, identity link, trust transfer, and demo blockers.

- [ ] **Step 1: Write failing component tests**

Run: `npx vitest run src/components/hub/NavigatorEnrollmentView.test.tsx src/components/hub/HubShell.test.tsx`

Expected: fails because the view and navigation item are missing.

- [ ] **Step 2: Add the view and hub navigation**

Render a compact navigator console view with labels: `In-person enrollment`, `Navigator-attested`, `Offline-capable intake`, `proofed_in_person`, `Trust transfer ready`, and `No real identity proofing or account creation`.

- [ ] **Step 3: Verify component tests pass**

Run: `npx vitest run src/components/hub/NavigatorEnrollmentView.test.tsx src/components/hub/HubShell.test.tsx`

Expected: all tests pass.

### Task 3: Local Gate And Release Wiring

**Files:**
- Create: `server/navigator-enrollment-gate.ts`
- Test: `server/navigator-enrollment-gate.test.ts`
- Create: `scripts/rhtp-navigator-enrollment-gate.ts`
- Modify: `package.json`
- Modify: `server/local-release-gate.ts`
- Modify: `server/local-release-gate.test.ts`

**Interfaces:**
- Produces: `runNavigatorEnrollmentGate(): NavigatorEnrollmentGateReport`
- Produces: `npm run enrollment:gate`

- [ ] **Step 1: Write failing gate and release tests**

Run: `npx vitest run server/navigator-enrollment-gate.test.ts server/local-release-gate.test.ts`

Expected: fails because the gate and `enrollment:gate` script are missing.

- [ ] **Step 2: Implement the gate and wire release**

The gate must pass five cases: synthetic/no-PHI, in-person proofing identity link, offline-capable completed intake, trust transfer ready, and real proofing/account creation blocked.

- [ ] **Step 3: Verify gate and release tests pass**

Run: `npx vitest run server/navigator-enrollment-gate.test.ts server/local-release-gate.test.ts`

Expected: all tests pass.

### Task 4: Ops Ledger And Proof

**Files:**
- Create: `docs/ops/red-team-results/2026-07-05-navigator-enrollment-gate.md`
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Modify: `docs/ops/RHTP-REAL-PHI-GATES.md`
- Modify: `docs/ops/red-team-results/2026-07-04-local-release-gate.md`

**Interfaces:**
- Consumes: `npm run enrollment:gate`
- Produces: local release proof stack updated to include `enrollment:gate`.

- [ ] **Step 1: Record proof docs and ledger entries**

Update local release command counts after the full gate passes.

- [ ] **Step 2: Run verification**

Run:

```bash
npx vitest run src/lib/navigator-enrollment.test.ts src/components/hub/NavigatorEnrollmentView.test.tsx src/components/hub/HubShell.test.tsx server/navigator-enrollment-gate.test.ts server/local-release-gate.test.ts
npm run enrollment:gate
npm run release:gate
git diff --check
```

Expected: all commands pass, with `release:gate` showing one more command than the previous stack.

- [ ] **Step 3: Commit locally**

Run:

```bash
git add docs package.json scripts server src
git commit -m "feat: add navigator enrollment demo gate"
```

## Self-Review

- Spec coverage: covers Appendix B.5 navigator-attested in-person enrollment tooling for the no-PHI stakeholder prototype.
- Placeholder scan: no placeholders or future-only implementation steps remain.
- Type consistency: model, helper, UI, and gate all use `NavigatorEnrollment` naming.
