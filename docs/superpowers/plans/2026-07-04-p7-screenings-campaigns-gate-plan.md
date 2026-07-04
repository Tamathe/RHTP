# P7 Screenings and Campaigns Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the no-PHI P7 local gate for conversational screenings, SDOH assistive-only behavior, and campaign rail reuse.

**Architecture:** Add a pure `server/p7-screenings-campaigns.ts` module that holds locked PHQ/GAD item text, deterministic scoring/routing, SDOH flag rules, and campaign cohort/barrier helpers. Add `server/p7-screenings-campaigns-gate.ts` plus `npm run p7:gate`, then update status artifacts to distinguish local demo proof from real behavioral-health/SDOH production readiness.

**Tech Stack:** TypeScript, Vitest, existing safety detector, existing gate script pattern.

## Global Constraints

- No real PHI: use synthetic/local inputs only.
- Models never score instruments or decide crisis routing.
- PHQ/GAD text is locked and rendered byte-identically from the local table.
- SDOH flags are assistive-only: they cannot reduce priority, remove cohort eligibility, or suppress outreach.
- Behavioral-health, interpersonal-safety, SUD, reproductive, and HIV content stays out of SMS/lock-screen style outbound channels.
- Real PHQ/GAD or SDOH use with patient data remains blocked until real consent, segmentation, counsel/clinical sign-off, RBAC/RLS, and review workflows are live.

---

### Task 1: P7 Pure Rail

**Files:**
- Create: `server/p7-screenings-campaigns.ts`
- Create: `server/p7-screenings-campaigns.test.ts`

**Interfaces:**
- Produces: `screeningItems`, `scorePhq2`, `scorePhq9`, `scoreGad7`, `routeScreeningResult`, `raiseSdohFlag`, `canSdohFlagChangeCarePriority`, `isOutboundCategoryAllowed`, `evaluateCampaignCohort`, and `createCampaignBarrierTask`.

- [ ] **Step 1: Write failing tests**

Run: `npx vitest run server/p7-screenings-campaigns.test.ts`

Expected: FAIL because `server/p7-screenings-campaigns.ts` is missing.

- [ ] **Step 2: Implement deterministic reducers**

Add locked PHQ/GAD items, pure scoring, immediate crisis routing via PHQ-9 item 9 or existing free-text red-flag screen, SDOH Z-code mapping, assistive-only guard, outbound category exclusion, deterministic campaign cohort evaluation, and campaign barrier task shaping.

- [ ] **Step 3: Verify green**

Run: `npx vitest run server/p7-screenings-campaigns.test.ts`

Expected: PASS.

### Task 2: P7 Gate Command

**Files:**
- Create: `server/p7-screenings-campaigns-gate.ts`
- Create: `server/p7-screenings-campaigns-gate.test.ts`
- Create: `scripts/rhtp-p7-screenings-campaigns-gate.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `runP7ScreeningsCampaignsGate()` with case ids and pass count.

- [ ] **Step 1: Write failing gate test**

Run: `npx vitest run server/p7-screenings-campaigns-gate.test.ts`

Expected: FAIL because the gate file is missing.

- [ ] **Step 2: Implement gate cases**

Gate cases:
`p7_locked_screening_items_byte_identical`, `p7_scoring_is_deterministic`, `p7_crisis_route_is_rule_based`, `p7_sdoh_flags_are_assistive_only`, `p7_campaign_reuses_barrier_task_shape`.

- [ ] **Step 3: Verify green**

Run: `npx vitest run server/p7-screenings-campaigns-gate.test.ts`

Expected: PASS.

### Task 3: Ledger, Docs, and Receipt

**Files:**
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Modify: `docs/ops/RHTP-FEATURE-FLAGS.md`
- Create: `docs/ops/red-team-results/2026-07-04-p7-screenings-campaigns-gate.md`

**Interfaces:**
- Consumes: `npm run p7:gate` output.
- Produces: P7 local proof that is demo-ready while real behavioral-health/SDOH production use remains real-PHI blocked.

- [ ] **Step 1: Update P7 status artifacts**

Mark P7 as `local_screening_campaign_gate_verified_demo_ready_real_phi_blocked`, add proof files, add a P7 workstream, and add `npm run p7:gate` to next actions.

- [ ] **Step 2: Run final verification**

Run:

```powershell
npm run p7:gate
npm run ops:status -- --blockers
npm run build
npm test
```

Expected: all commands exit 0; status still shows no open demo blockers and real-PHI blockers separately.

- [ ] **Step 3: Commit**

```powershell
git add package.json server/p7-screenings-campaigns.ts server/p7-screenings-campaigns.test.ts server/p7-screenings-campaigns-gate.ts server/p7-screenings-campaigns-gate.test.ts scripts/rhtp-p7-screenings-campaigns-gate.ts docs/ops/rhtp-release-ledger.json docs/ops/RHTP-DEPLOYMENT-CONTROL.md docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md docs/ops/RHTP-FEATURE-FLAGS.md docs/ops/red-team-results/2026-07-04-p7-screenings-campaigns-gate.md docs/superpowers/plans/2026-07-04-p7-screenings-campaigns-gate-plan.md
git commit -m "feat: add p7 screenings campaign gate"
```
