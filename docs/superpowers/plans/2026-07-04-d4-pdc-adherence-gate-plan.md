# D4 PDC Adherence Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve D4 locally by adding a deterministic `pdc_diabetes` policy/calculation gate for the claims-PDC adherence floor.

**Architecture:** Add a focused PDC module that classifies diabetes medication claims, calculates covered days over the PQA/CMS treatment period, and emits a refill-gap signal below the 80% threshold. Add a gate module and CLI script that report the D4 evidence into the existing ops/status pattern.

**Tech Stack:** TypeScript, Vitest, tsx CLI scripts, existing JSON release ledger.

## Global Constraints

- Keep this local/no-PHI only.
- PDC is claims-first and derives from `pharmacy_fill_claim`, not device-only data.
- The local policy follows CMS 2026 QRS/PQA `Diabetes All Class (PDC-DR)`: treatment period starts at IPSD and ends at measurement-year end/disenrollment/death; threshold is PDC >= 80%; included diabetes tables are BG, SFU, TZD, DPP4, GIP/GLP1, MEG, and SGLT2; insulin claims are exclusions.
- Do not claim production PDC readiness until real claims ingestion, official value-set loading, and production FHIR writes exist.

---

### Task 1: PDC policy and calculation

**Files:**
- Create: `server/pdc-adherence.test.ts`
- Create: `server/pdc-adherence.ts`

**Interfaces:**
- Produces: `PDC_DIABETES_POLICY`, `classifyDiabetesMedication(name)`, `calculateDiabetesPdc(input)`, `buildRefillGapInsight(input)`.

- [x] **Step 1: Write failing tests**
- [x] **Step 2: Run `npx vitest run server/pdc-adherence.test.ts` and confirm the module is missing**
- [x] **Step 3: Implement the minimal deterministic policy/calculator**
- [x] **Step 4: Re-run the focused test and confirm green**

### Task 2: D4 gate command

**Files:**
- Create: `server/d4-pdc-gate.test.ts`
- Create: `server/d4-pdc-gate.ts`
- Create: `scripts/rhtp-d4-pdc-gate.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `calculateDiabetesPdc`, `classifyDiabetesMedication`, `buildRefillGapInsight`.
- Produces: `runD4PdcGate()`.

- [x] **Step 1: Write failing gate tests**
- [x] **Step 2: Run `npx vitest run server/d4-pdc-gate.test.ts` and confirm the gate is missing**
- [x] **Step 3: Implement the gate report and CLI**
- [x] **Step 4: Run `npm run d4:gate` and confirm the cases pass**

### Task 3: Ops status and docs

**Files:**
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Modify: `docs/ops/RHTP-P5-DECISIONS.md`
- Create: `docs/ops/red-team-results/2026-07-04-d4-pdc-adherence-gate.md`

**Interfaces:**
- Consumes: `npm run d4:gate` output.
- Produces: updated local status board with D4 closed as a local operating decision and residual production PDC work named.

- [x] **Step 1: Update ledger proof and blocker status**
- [x] **Step 2: Add runbook/control docs for the D4 command**
- [x] **Step 3: Record the gate output in red-team results**
- [x] **Step 4: Run `npm run ops:status -- --blockers` and confirm D4 no longer appears as an open blocker**

### Task 4: Verification and commit

**Files:**
- All D4 files above.

- [ ] **Step 1: Run focused tests and `npm run d4:gate`**
- [ ] **Step 2: Run full regression commands for the repo gates touched by the ledger**
- [ ] **Step 3: Run `git diff --check` and inspect scoped diff**
- [ ] **Step 4: Commit with `feat: add d4 pdc adherence gate`**
