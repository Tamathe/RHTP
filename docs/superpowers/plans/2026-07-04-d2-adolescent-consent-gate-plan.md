# D2 Adolescent Consent Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve D2 locally by pinning Kentucky adolescent minor-consent and guardian/proxy disclosure rules before PHQ/GAD and SDOH packs.

**Architecture:** Add a focused adolescent consent policy module that maps service category, age, provider role, unaccompanied-youth status, guardian consent, and emergency status to a deterministic access/proxy decision. Add a gate module and CLI script that report the D2 evidence into the existing ops/status pattern.

**Tech Stack:** TypeScript, Vitest, tsx CLI scripts, existing JSON release ledger.

## Global Constraints

- Keep this local/no-PHI only.
- Use current Kentucky/HHS sources as policy inputs: KRS 214.185, KRS 222.441, and HHS HIPAA personal-representative guidance.
- Default-suppress minor-consented PHQ/GAD, SUD, reproductive/STI/HIV, and other adolescent-confidential facts from guardian proxy and AI context.
- Do not claim production legal readiness until Kentucky counsel/clinical owner sign-off is recorded.

---

### Task 1: Adolescent policy and proxy rules

**Files:**
- Create: `server/adolescent-consent-policy.test.ts`
- Create: `server/adolescent-consent-policy.ts`

**Interfaces:**
- Produces: `KENTUCKY_ADOLESCENT_CONSENT_POLICY`, `evaluateAdolescentConsent(input)`, `evaluateGuardianProxyDisclosure(input)`.

- [x] **Step 1: Write failing tests**
- [x] **Step 2: Run `npx vitest run server/adolescent-consent-policy.test.ts` and confirm the module is missing**
- [x] **Step 3: Implement the minimal deterministic policy**
- [x] **Step 4: Re-run the focused test and confirm green**

### Task 2: D2 gate command

**Files:**
- Create: `server/d2-adolescent-consent-gate.test.ts`
- Create: `server/d2-adolescent-consent-gate.ts`
- Create: `scripts/rhtp-d2-adolescent-consent-gate.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `evaluateAdolescentConsent`, `evaluateGuardianProxyDisclosure`.
- Produces: `runD2AdolescentConsentGate()`.

- [x] **Step 1: Write failing gate tests**
- [x] **Step 2: Run `npx vitest run server/d2-adolescent-consent-gate.test.ts` and confirm the gate is missing**
- [x] **Step 3: Implement the gate report and CLI**
- [x] **Step 4: Run `npm run d2:gate` and confirm the cases pass**

### Task 3: Ops status and docs

**Files:**
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Create: `docs/ops/RHTP-D2-ADOLESCENT-CONSENT-DECISION.md`
- Create: `docs/ops/red-team-results/2026-07-04-d2-adolescent-consent-gate.md`

**Interfaces:**
- Consumes: `npm run d2:gate` output.
- Produces: updated local status board with D2 closed as a local operating decision and residual legal/production work named.

- [x] **Step 1: Update ledger proof and blocker status**
- [x] **Step 2: Add runbook/control docs for the D2 command**
- [x] **Step 3: Record the gate output in red-team results**
- [x] **Step 4: Run `npm run ops:status -- --blockers` and confirm D2 no longer appears as an open blocker**

### Task 4: Verification and commit

**Files:**
- All D2 files above.

- [ ] **Step 1: Run focused tests and `npm run d2:gate`**
- [ ] **Step 2: Run full regression commands for the repo gates touched by the ledger**
- [ ] **Step 3: Run `git diff --check` and inspect scoped diff**
- [ ] **Step 4: Commit with `feat: add d2 adolescent consent gate`**
