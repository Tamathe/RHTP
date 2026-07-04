# Claims Ingest Identity Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the local E2 identity gate into a production-shaped claims ingest seam so external claims facts cannot attach or drive outreach unless identity corroboration and patient-confirmation rules allow it.

**Architecture:** Extend the prototype state shape toward the spec's `patient_identities` and enriched `source_facts` rows, then add a backend claims-ingest action and route that call the existing identity corroboration gate before landing facts. Keep the FHIR store simulated by `fhirRef` strings; do not claim real FHIR/claims connectivity.

**Tech Stack:** TypeScript strict mode, Vitest, existing file-backed backend state, existing route/action pattern.

## Global Constraints

- Production table name: `patient_identities`.
- `source_facts` fields must include `patient_confirmed`, `navigator_overridden`, and `fhir_ref`.
- `/api/ingest/claims` must not attach facts as plan-driving truth when identity fails or is unconfirmed.
- A deterministic strong-ID-only match must downgrade to `identity_match_review`, never auto-link.
- A corroborated but newly linked external record may land internally with `patientConfirmed=false`, but must not emit autonomous outreach or patient-facing clinical-adjacent claims before first patient confirmation.
- This is still no-PHI local prototype work; real FHIR/claims connectivity, MPI ownership, RLS, Part 2, and BAAs remain open.

---

### Task 1: State Shape

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/seed.ts`
- Modify: `src/data/seed.test.ts`
- Modify: `server/state.ts`
- Modify: `server/state.test.ts`

**Interfaces:**
- Produces: `PatientIdentity`
- Produces: `SourceFact.patientConfirmed`, `SourceFact.navigatorOverridden`, `SourceFact.fhirRef?: string`
- Consumes: existing `SeedState` and `BackendState`

- [ ] **Step 1: Write failing tests**

Add tests proving the seed has `patientIdentities` and every `SourceFact` has confirmation/provenance fields; add a legacy-state hydration test proving older saved states receive `patientIdentities: []` and default source-fact confirmation fields.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/seed.test.ts server/state.test.ts`
Expected: FAIL because the fields are not present.

- [ ] **Step 3: Implement minimal state shape**

Add the types and fill seed/default hydration fields.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/seed.test.ts server/state.test.ts`
Expected: PASS.

### Task 2: Claims Ingest Action and Route

**Files:**
- Modify: `server/actions.test.ts`
- Modify: `server/actions.ts`
- Modify: `server/routes.test.ts`
- Modify: `server/routes.ts`

**Interfaces:**
- Produces: `ingestClaimsFacts(state, input)`
- Produces: `POST /api/ingest/claims`
- Consumes: `recordIdentityCorroboration`, `PatientIdentity`, and enriched `SourceFact`

- [ ] **Step 1: Write failing tests**

Add action and route tests proving uncorroborated identity queues review and lands no facts, while corroborated pre-confirmation identity lands facts with `patientConfirmed=false`, creates a `patientIdentities` row, and emits no protocol events.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/actions.test.ts server/routes.test.ts`
Expected: FAIL because `ingestClaimsFacts` and `/api/ingest/claims` do not exist.

- [ ] **Step 3: Implement minimal claims ingest**

Add payload validation, call identity gate, append facts only for `auto_link`, and never emit protocol events before confirmation.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/actions.test.ts server/routes.test.ts`
Expected: PASS.

### Task 3: Proof Command and Ledger

**Files:**
- Modify: `server/identity-gate.ts`
- Modify: `server/identity-gate.test.ts`
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/red-team-results/2026-07-04-e2-identity-gate.md`

**Interfaces:**
- Updates: `npm run identity:gate`
- Consumes: new claims-ingest action

- [ ] **Step 1: Extend proof command tests**

Add a case proving claims ingest is held on uncorroborated identity and a case proving pre-confirmation claims facts do not create protocol events.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/identity-gate.test.ts`
Expected: FAIL until the report checks ingest behavior.

- [ ] **Step 3: Implement proof report update**

Add ingest checks to `runE2IdentityGate`.

- [ ] **Step 4: Verify and commit**

Run: `npm test`, `npm run identity:gate`, `npm run safety:gate`, `npm run voice:redteam`, `npm run build`, `npm run ops:status`, `git diff --check`.
Commit: `feat: wire identity gate into claims ingest`.
