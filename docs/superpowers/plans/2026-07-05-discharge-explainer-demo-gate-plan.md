# Discharge Explainer Demo Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-PHI stakeholder-demo path for after-visit/discharge plain-language explainers.

**Architecture:** Add a typed synthetic explainer artifact to seed state, render it in a patient-phone screen, and prove it through a local gate. The gate verifies synthetic/no-PHI posture, source citations, navigator/clinician boundaries, and explicit blocking of real HIE document retrieval or model-generated medical advice.

**Tech Stack:** TypeScript, React, Zustand seed state, Vitest, local TSX gate scripts.

## Global Constraints

- Stakeholder prototype only: no real patient data, real claims, real HIE documents, real phone numbers, or real clinical facts.
- `RHTP_REAL_PHI` must remain off or unset.
- Any discharge explainer must be grounded in seeded source references and show patient-facing safety boundaries.
- Real HIE document retrieval, clinical interpretation, diagnosis, medication changes, and discharge-instruction replacement remain blocked.

---

### Task 1: Seeded Explainer Model

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/seed.ts`
- Modify: `server/state.ts`
- Create: `src/lib/plain-language-explainer.ts`
- Test: `src/lib/plain-language-explainer.test.ts`

**Interfaces:**
- Produces: `PlainLanguageExplainer`, `PlainLanguageExplainerSection`, `PlainLanguageExplainerQuestion`
- Produces: `plainLanguageExplainerIsPrototypeSafe(explainer: PlainLanguageExplainer): boolean`
- Produces: `findPlainLanguageExplainerForPatient(explainers: PlainLanguageExplainer[], patientId: string): PlainLanguageExplainer | undefined`

- [ ] **Step 1: Write failing helper tests**

Run: `npx vitest run src/lib/plain-language-explainer.test.ts`

Expected: fails because `plain-language-explainer.ts` and seed fields do not exist.

- [ ] **Step 2: Add the minimal model and synthetic seed artifact**

Add one synthetic discharge explainer for Ruth Ann. Its source fact uses `DocumentReference/ruth_discharge_demo`, every section/question cites the source fact, `patientDataIncluded` is `false`, and blockers include `prototype_no_real_hie_document` plus `prototype_no_medical_advice`.

- [ ] **Step 3: Verify helper tests pass**

Run: `npx vitest run src/lib/plain-language-explainer.test.ts`

Expected: all tests pass.

### Task 2: Patient Phone Surface

**Files:**
- Create: `src/components/phone/AfterVisitExplainerScreen.tsx`
- Test: `src/components/AfterVisitExplainerScreen.test.tsx`
- Modify: `src/components/phone/PhoneApp.tsx`
- Modify: `src/components/phone/PhoneApp.test.tsx`

**Interfaces:**
- Consumes: `findPlainLanguageExplainerForPatient`
- Produces: a `Visit` phone tab showing cited plain-language discharge explainer content and safety copy.

- [ ] **Step 1: Write failing component tests**

Run: `npx vitest run src/components/AfterVisitExplainerScreen.test.tsx src/components/phone/PhoneApp.test.tsx`

Expected: fails because the screen and tab are missing.

- [ ] **Step 2: Add the screen and tab**

Render the explainer title, source label, cited sections, patient questions, and clear demo-only safety boundary.

- [ ] **Step 3: Verify component tests pass**

Run: `npx vitest run src/components/AfterVisitExplainerScreen.test.tsx src/components/phone/PhoneApp.test.tsx`

Expected: all tests pass.

### Task 3: Local Gate And Release Wiring

**Files:**
- Create: `server/discharge-explainer-gate.ts`
- Test: `server/discharge-explainer-gate.test.ts`
- Create: `scripts/rhtp-discharge-explainer-gate.ts`
- Modify: `package.json`
- Modify: `server/local-release-gate.ts`
- Modify: `server/local-release-gate.test.ts`

**Interfaces:**
- Produces: `runDischargeExplainerGate(): DischargeExplainerGateReport`
- Produces: `npm run explainer:gate`

- [ ] **Step 1: Write failing gate and release tests**

Run: `npx vitest run server/discharge-explainer-gate.test.ts server/local-release-gate.test.ts`

Expected: fails because the gate and `explainer:gate` script are missing.

- [ ] **Step 2: Implement the gate and wire release**

The gate must pass five cases: synthetic/no-PHI, source DocumentReference link, cited sections/questions, safety boundaries, and real-HIE/advice blockers.

- [ ] **Step 3: Verify gate and release tests pass**

Run: `npx vitest run server/discharge-explainer-gate.test.ts server/local-release-gate.test.ts`

Expected: all tests pass.

### Task 4: Ops Ledger And Proof

**Files:**
- Create: `docs/ops/red-team-results/2026-07-05-discharge-explainer-gate.md`
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Modify: `docs/ops/RHTP-REAL-PHI-GATES.md`
- Modify: `docs/ops/red-team-results/2026-07-04-local-release-gate.md`

**Interfaces:**
- Consumes: `npm run explainer:gate`
- Produces: local release proof stack updated to include `explainer:gate`.

- [ ] **Step 1: Record proof docs and ledger entries**

Update local release command counts after the full gate passes.

- [ ] **Step 2: Run verification**

Run:

```bash
npx vitest run src/lib/plain-language-explainer.test.ts src/components/AfterVisitExplainerScreen.test.tsx src/components/phone/PhoneApp.test.tsx server/discharge-explainer-gate.test.ts server/local-release-gate.test.ts
npm run explainer:gate
npm run release:gate
git diff --check
```

Expected: all commands pass, with `release:gate` showing one more command than the previous stack.

- [ ] **Step 3: Commit locally**

Run:

```bash
git add docs package.json scripts server src
git commit -m "feat: add discharge explainer demo gate"
```

## Self-Review

- Spec coverage: covers Appendix B.5 after-visit/discharge plain-language explainers for the no-PHI stakeholder prototype.
- Placeholder scan: no placeholders or future-only implementation steps remain.
- Type consistency: model, helper, UI, and gate all use `PlainLanguageExplainer` naming.
