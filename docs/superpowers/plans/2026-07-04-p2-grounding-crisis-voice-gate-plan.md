# P2 Grounding Crisis Voice Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic P2 safety gate for Sandy: grounding verification, crisis/red-flag recall corpus, and a command that blocks real voice readiness claims until the gate passes.

**Architecture:** Keep the current demo app and P1 backend intact. Add pure safety modules under `src/lib`, wire the existing `screenPatientMessage` through the new crisis detector, and add a local gate script under `scripts`. Ops docs record proof without enabling real voice or real-PHI deployment.

**Tech Stack:** TypeScript 5.7 strict mode, Vitest 4, existing React/Vite app, Node/tsx scripts.

## Global Constraints

- Work only in `C:\Projects\rhtp-prototype`.
- Use seed/demo data only.
- Do not add real PHI, real HIE, real claims feeds, real EMR integration, or real OpenAI voice sessions.
- No secrets, API keys, or model calls.
- Deterministic rules decide; models may only explain or add blocks.
- Sandy may not diagnose, change medications, reassure red flags, or close clinical concerns outside the protocol.
- Real voice flags remain off until the safety gate passes and proof is recorded.
- Use TDD: write failing tests first, implement the smallest passing change, then verify.

---

## File Structure

- Create `src/lib/grounding.ts`: deterministic grounding verifier and claim extraction.
- Create `src/lib/grounding.test.ts`: H1 verifier tests.
- Create `src/lib/crisis-red-flags.ts`: versioned deterministic crisis/red-flag detector.
- Create `src/lib/crisis-red-flags.corpus.ts`: maintained adversarial corpus and recall floor.
- Create `src/lib/crisis-red-flags.test.ts`: E1 deterministic recall and backstop behavior tests.
- Modify `src/lib/safety.ts`: delegate red-flag detection to `screenCrisisRedFlags`.
- Modify `src/lib/safety.test.ts`: cover suicidal ideation and retained retinopathy behavior.
- Create `scripts/rhtp-safety-gate.ts`: local gate command for H1 and deterministic E1 evidence.
- Modify `package.json`: add `safety:gate`.
- Modify `docs/ops/rhtp-release-ledger.json`: record H1 proof, deterministic E1 partial proof, and keep P2 blocked.
- Modify `docs/ops/RHTP-REAL-PHI-GATES.md`: mirror the H1/E1 status honestly.
- Modify `docs/superpowers/sprints/2026-07-04-p2-grounding-crisis-voice-gate-sprint.md`: mark spec and plan written.

---

### Task 1: Add Grounding Verifier

**Files:**
- Create: `src/lib/grounding.test.ts`
- Create: `src/lib/grounding.ts`

**Interfaces:**
- Produces: `verifyGrounding(input: GroundingVerificationInput): GroundingVerificationResult`
- Produces: `containsClinicalAdjacentClaim(answer: string): boolean`
- Produces: `extractQuantitativeClaims(answer: string): QuantitativeClaim[]`

- [ ] **Step 1: Write failing tests**

Add tests for supported claims, unsupported A1C mismatch, unsupported normal eye-result claim, dosing/medication-change blocks, and uncited clinical-adjacent claims.

- [ ] **Step 2: Verify red**

Run: `npm run test -- src/lib/grounding.test.ts`

Expected: FAIL because `src/lib/grounding.ts` does not exist.

- [ ] **Step 3: Implement verifier**

Implement pure deterministic checks only. Do not call a model.

- [ ] **Step 4: Verify green**

Run: `npm run test -- src/lib/grounding.test.ts`

Expected: PASS.

### Task 2: Add Crisis Detector And Corpus

**Files:**
- Create: `src/lib/crisis-red-flags.test.ts`
- Create: `src/lib/crisis-red-flags.ts`
- Create: `src/lib/crisis-red-flags.corpus.ts`

**Interfaces:**
- Produces: `screenCrisisRedFlags(input: string, options?: CrisisScreeningOptions): CrisisScreeningResult`
- Produces: `measureCrisisRecall(cases?: CrisisCorpusCase[]): CrisisRecallReport`
- Produces: `CRISIS_RECALL_FLOOR`

- [ ] **Step 1: Write failing tests**

Add tests for retinopathy red flags, suicidal ideation, self-harm, acute danger, non-crisis logistics text, recall-floor measurement, and model-net-only rule-gap tickets.

- [ ] **Step 2: Verify red**

Run: `npm run test -- src/lib/crisis-red-flags.test.ts`

Expected: FAIL because `src/lib/crisis-red-flags.ts` and corpus do not exist.

- [ ] **Step 3: Implement detector and corpus**

Implement versioned rules and corpus measurement.

- [ ] **Step 4: Verify green**

Run: `npm run test -- src/lib/crisis-red-flags.test.ts`

Expected: PASS.

### Task 3: Wire Safety Layer To New Detector

**Files:**
- Modify: `src/lib/safety.ts`
- Modify: `src/lib/safety.test.ts`
- Existing tests: `server/actions.test.ts`, `src/store/useStore.test.ts`

**Interfaces:**
- Consumes: `screenCrisisRedFlags`
- Produces: broader `screenPatientMessage` red-flag coverage without changing caller signatures.

- [ ] **Step 1: Add failing safety test**

Add a test proving "I do not want to wake up" routes to `red_flag` and `red_flag_symptom`.

- [ ] **Step 2: Verify red**

Run: `npm run test -- src/lib/safety.test.ts`

Expected: FAIL because current `screenPatientMessage` does not detect the new phrase.

- [ ] **Step 3: Wire implementation**

Call `screenCrisisRedFlags(input)` before off-protocol checks.

- [ ] **Step 4: Verify green and regression coverage**

Run: `npm run test -- src/lib/safety.test.ts server/actions.test.ts src/store/useStore.test.ts`

Expected: PASS.

### Task 4: Add Safety Gate Command

**Files:**
- Create: `scripts/rhtp-safety-gate.ts`
- Modify: `package.json`

**Interfaces:**
- Produces CLI command: `npm run safety:gate`

- [ ] **Step 1: Write script**

The script imports the crisis corpus and grounding verifier, prints measured recall, and exits nonzero if any gate fails.

- [ ] **Step 2: Verify command**

Run: `npm run safety:gate`

Expected: PASS with deterministic recall at or above `0.95`.

### Task 5: Update Ops Proof

**Files:**
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-REAL-PHI-GATES.md`
- Modify: `docs/superpowers/sprints/2026-07-04-p2-grounding-crisis-voice-gate-sprint.md`

**Interfaces:**
- Consumes: test and gate proof from Tasks 1-4.
- Produces: honest H1 closed / E1 partial / P2 still blocked status.

- [ ] **Step 1: Update ledger**

Record H1 as closed with proof paths. Keep E1 open with deterministic recall proof and model-backstop residual noted. Keep P2 blocked.

- [ ] **Step 2: Verify status command**

Run: `npm run ops:status -- --blockers`

Expected: H1 no longer appears as open; E1 and P2-related blockers remain visible.

### Task 6: Final Verification And Commit

**Files:**
- All changed files.

- [ ] **Step 1: Run focused tests**

Run: `npm run test -- src/lib/grounding.test.ts src/lib/crisis-red-flags.test.ts src/lib/safety.test.ts server/actions.test.ts src/store/useStore.test.ts`

Expected: PASS.

- [ ] **Step 2: Run safety gate**

Run: `npm run safety:gate`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add package.json tsconfig.json docs/ops docs/superpowers scripts src/lib server src/store
git commit -m "feat: add p2 safety gate"
```

## Self-Review

- Spec coverage: H1, deterministic E1 recall floor, adversarial corpus, P2 gate command, and ops ledger are covered.
- No real voice, model call, secret, or real-PHI deployment is introduced.
- H1 and E1 statuses remain separated to avoid overclaiming real-PHI readiness.
