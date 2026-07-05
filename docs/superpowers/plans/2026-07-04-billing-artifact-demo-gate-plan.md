# Billing Artifact Demo Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a no-PHI local billing-artifact demo lane so stakeholders can see how navigator time, RPM reading days, documentation evidence, and grant/claim support would be captured without claiming real billing readiness.

**Architecture:** Add typed synthetic billing evidence records to the seed state, a pure summarizer in `src/lib/billing-artifacts.ts`, a `BillingEvidenceView` in the hub, and a `billing:gate` command that proves the lane stays synthetic and non-submitting. Update the release ledger and local release gate so this becomes part of the stakeholder demo proof stack.

**Tech Stack:** TypeScript, React, Zustand seed state, Vitest, existing `tsx` gate-script pattern.

## Global Constraints

- No real PHI: every billing record must be synthetic local demo evidence.
- No claim submission: the prototype may show billable-evidence readiness, but `claimSubmissionReady` remains false.
- Rules decide: eligibility status comes from deterministic counts and review flags, not a model.
- Humans own exceptions: any real billing/export would require navigator/admin review and production payer/legal setup.
- Real payer contracts, EHR billing integration, claims submission, and financial compliance sign-off remain out of scope.

---

### Task 1: Billing Artifact Model

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/seed.ts`
- Create: `src/lib/billing-artifacts.ts`
- Create: `src/lib/billing-artifacts.test.ts`

**Interfaces:**
- Produces: `BillingEvidenceRecord`, `BillingEvidenceCode`, `summarizeBillingEvidence`, and `billingEvidenceIsPrototypeSafe`.

- [x] **Step 1: Write failing summarizer tests**

Run: `npm test -- src/lib/billing-artifacts.test.ts`

Expected: FAIL because `src/lib/billing-artifacts.ts` does not exist.

- [x] **Step 2: Implement model and seed records**

Add synthetic records for CCM minutes, RPM reading days, APCM documentation, and CHW navigation evidence. Summaries must count total minutes, reading days, documented artifacts, ready records, and claim-submission blockers.

- [x] **Step 3: Verify green**

Run: `npm test -- src/lib/billing-artifacts.test.ts`

Expected: PASS.

### Task 2: Hub Billing Evidence View

**Files:**
- Create: `src/components/hub/BillingEvidenceView.tsx`
- Create: `src/components/BillingEvidenceView.test.tsx`
- Modify: `src/components/hub/HubShell.tsx`
- Modify: `src/components/hub/HubShell.test.tsx`

**Interfaces:**
- Consumes: `useStore().billingEvidenceRecords` and `summarizeBillingEvidence`.
- Produces: a hub tab labeled `Billing evidence`.

- [x] **Step 1: Write failing view tests**

Run: `npm test -- src/components/BillingEvidenceView.test.tsx src/components/hub/HubShell.test.tsx`

Expected: FAIL because the view and nav item do not exist.

- [x] **Step 2: Implement view and nav**

Render summary counters, evidence records, and a clear prototype-only claim-submission boundary.

- [x] **Step 3: Verify green**

Run: `npm test -- src/components/BillingEvidenceView.test.tsx src/components/hub/HubShell.test.tsx`

Expected: PASS.

### Task 3: Billing Gate, Ledger, and Release Proof

**Files:**
- Create: `server/billing-artifact-gate.ts`
- Create: `server/billing-artifact-gate.test.ts`
- Create: `scripts/rhtp-billing-artifact-gate.ts`
- Modify: `package.json`
- Modify: `server/local-release-gate.ts`
- Modify: `server/local-release-gate.test.ts`
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Create: `docs/ops/red-team-results/2026-07-04-billing-artifact-gate.md`

**Interfaces:**
- Produces: `runBillingArtifactGate()` and `npm run billing:gate`.

- [x] **Step 1: Write failing gate tests**

Run: `npm test -- server/billing-artifact-gate.test.ts server/local-release-gate.test.ts`

Expected: FAIL because `billing:gate` is not in the local release gate and the billing gate does not exist.

- [x] **Step 2: Implement gate and script**

Gate cases: `billing_records_are_synthetic_no_phi`, `ccm_minutes_are_documented`, `rpm_reading_days_meet_demo_floor`, `artifacts_have_source_event_links`, and `claim_submission_stays_blocked`.

- [x] **Step 3: Update docs and ledger**

Record the slice as local no-PHI demo evidence only; real billing submission remains unbuilt.

- [x] **Step 4: Final verification**

Run:

```powershell
npm run billing:gate
npm test -- src/lib/billing-artifacts.test.ts src/components/BillingEvidenceView.test.tsx src/components/hub/HubShell.test.tsx server/billing-artifact-gate.test.ts server/local-release-gate.test.ts
npm run release:gate
git diff --check
```

Expected: all commands exit 0; local release gate includes `billing:gate`.

- [x] **Step 5: Commit**

```powershell
git add src/types.ts src/data/seed.ts src/lib/billing-artifacts.ts src/lib/billing-artifacts.test.ts src/components/hub/BillingEvidenceView.tsx src/components/BillingEvidenceView.test.tsx src/components/hub/HubShell.tsx src/components/hub/HubShell.test.tsx server/billing-artifact-gate.ts server/billing-artifact-gate.test.ts scripts/rhtp-billing-artifact-gate.ts package.json server/local-release-gate.ts server/local-release-gate.test.ts docs/ops/rhtp-release-ledger.json docs/ops/RHTP-DEPLOYMENT-CONTROL.md docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md docs/ops/red-team-results/2026-07-04-billing-artifact-gate.md docs/superpowers/plans/2026-07-04-billing-artifact-demo-gate-plan.md
git commit -m "feat: add billing artifact demo gate"
```
