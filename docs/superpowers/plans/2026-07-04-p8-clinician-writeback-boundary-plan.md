# P8 Clinician Writeback Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the no-PHI P8 local boundary for clinician-summary writeback: navigator-reviewed only, prohibited content blocked, EMR-launch-only surface gating, and synthetic multi-county expansion proof.

**Architecture:** Add a pure server module in `server/clinician-writeback.ts` that creates, signs, approves, and persists local `DocumentReference` drafts without touching an EMR. Add `server/p8-writeback-gate.ts` plus `npm run p8:gate`, then update the ledger/docs to mark P8 local boundary proof without claiming live SMART-on-FHIR or EMR writeback.

**Tech Stack:** TypeScript, Vitest, existing backend state/audit helpers, existing `tsx` script pattern.

## Global Constraints

- No real PHI: use synthetic/local state only.
- No autonomous writeback: `clinician_approved` requires a prior `navigator_signed` state.
- Prohibited content is blocked: no diagnosis, dosing recommendation, or triage disposition in a writeback artifact.
- Clinician view is gated behind the P8 flag and EMR-launch context; it is not a default navigator-console surface.
- Real SMART-on-FHIR launch, TEFCA IAS, EMR persistence, and multi-county live expansion remain out of scope.

---

### Task 1: Local Writeback State Machine

**Files:**
- Create: `server/clinician-writeback.ts`
- Create: `server/clinician-writeback.test.ts`

**Interfaces:**
- Produces: `createClinicianWritebackDraft`, `signClinicianWritebackDraft`, `approveClinicianWritebackDraft`, `persistClinicianWritebackDraft`, `getClinicianSummarySurface`, and `summarizeExpansionCohorts`.
- Consumes: existing `BackendState`, `appendAuditEvent`, and seed patients.

- [ ] **Step 1: Write failing tests**

Run: `npx vitest run server/clinician-writeback.test.ts`

Expected: FAIL because `server/clinician-writeback.ts` is missing.

- [ ] **Step 2: Implement minimal state machine**

Create immutable functions that return `{ state, ok, draft?, reason? }`, append audit events, block prohibited content, and require `navigator_signed` before approval.

- [ ] **Step 3: Verify green**

Run: `npx vitest run server/clinician-writeback.test.ts`

Expected: PASS.

### Task 2: P8 Gate Command

**Files:**
- Create: `server/p8-writeback-gate.ts`
- Create: `server/p8-writeback-gate.test.ts`
- Create: `scripts/rhtp-p8-writeback-gate.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `runP8WritebackGate()` with case ids and pass count.

- [ ] **Step 1: Write failing gate test**

Run: `npx vitest run server/p8-writeback-gate.test.ts`

Expected: FAIL because `server/p8-writeback-gate.ts` is missing.

- [ ] **Step 2: Implement gate cases**

Gate cases:
`p8_writeback_requires_navigator_signature`, `p8_prohibited_content_blocked_and_audited`, `p8_signed_summary_can_be_approved_and_persisted`, `p8_clinician_surface_emr_launch_only`, `p8_expansion_summary_uses_synthetic_multi_county_cohort`.

- [ ] **Step 3: Verify green**

Run: `npx vitest run server/p8-writeback-gate.test.ts`

Expected: PASS.

### Task 3: Ledger, Docs, and Receipt

**Files:**
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Modify: `docs/ops/RHTP-FEATURE-FLAGS.md`
- Create: `docs/ops/red-team-results/2026-07-04-p8-writeback-gate.md`

**Interfaces:**
- Consumes: `npm run p8:gate` output.
- Produces: P8 status proof that is local boundary verified while live SMART-on-FHIR/EMR/TEFCA remain blocked.

- [ ] **Step 1: Update P8 status artifacts**

Mark P8 as `local_writeback_boundary_verified_demo_ready_real_emr_blocked`, add proof files, add a P8 workstream, and add `npm run p8:gate` to next actions.

- [ ] **Step 2: Run final verification**

Run:

```powershell
npm run p8:gate
npm run ops:status -- --blockers
npm run build
npm test
```

Expected: all commands exit 0; status still shows no open demo blockers and real-PHI blockers separately.

- [ ] **Step 3: Commit**

```powershell
git add package.json server/clinician-writeback.ts server/clinician-writeback.test.ts server/p8-writeback-gate.ts server/p8-writeback-gate.test.ts scripts/rhtp-p8-writeback-gate.ts docs/ops/rhtp-release-ledger.json docs/ops/RHTP-DEPLOYMENT-CONTROL.md docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md docs/ops/RHTP-FEATURE-FLAGS.md docs/ops/red-team-results/2026-07-04-p8-writeback-gate.md docs/superpowers/plans/2026-07-04-p8-clinician-writeback-boundary-plan.md
git commit -m "feat: add p8 writeback gate"
```
