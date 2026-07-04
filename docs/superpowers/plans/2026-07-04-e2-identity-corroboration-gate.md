# E2 Identity Corroboration Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local E2 gate proving that deterministic strong-ID matches do not auto-link without DOB/name corroboration and that newly linked external records cannot drive autonomous patient-facing outreach before patient confirmation.

**Architecture:** Add a focused pure identity-corroboration module, then wire it through backend actions and a small API route. Keep the current prototype data model intact, using audit events and navigator queue work as the local proof surface rather than pretending the production `patient_identities` table exists.

**Tech Stack:** TypeScript strict mode, Vitest, existing backend action/store pattern, existing `docs/ops/rhtp-release-ledger.json` status command.

## Global Constraints

- Appendix B.1 E2: strong-ID matches must corroborate DOB and/or name or downgrade to navigator review.
- Section 05.5: a deterministic 1.0 strong-ID hit is a candidate, not a link, unless an independent demographic corroborates it.
- Section 05.5: no autonomous outreach on a newly linked external record until first patient confirmation.
- Existing real-PHI status remains blocked; this slice is local control proof only.

---

### Task 1: Pure Identity Corroboration Rules

**Files:**
- Create: `src/lib/identity-corroboration.test.ts`
- Create: `src/lib/identity-corroboration.ts`
- Modify: `src/types.ts`
- Modify: `src/lib/retinopathy-protocol.ts`
- Modify: `src/components/hub/NavigatorQueueView.tsx`

**Interfaces:**
- Produces: `corroborateIdentity(candidate, external): IdentityCorroborationResult`
- Produces: `canAutonomouslyUseExternalRecord(result): boolean`
- Consumes: `NavigatorQueueReason` with new `identity_match_review` member

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { canAutonomouslyUseExternalRecord, corroborateIdentity } from './identity-corroboration'

describe('identity corroboration', () => {
  const candidate = {
    patientId: 'pat_ruthann',
    name: 'Ruth Ann Caldwell',
    dateOfBirth: '1974-03-14',
    strongIds: { payer_member_id: 'KY-MCO-123' },
  }

  it('downgrades a deterministic strong-ID-only hit to navigator identity review', () => {
    const result = corroborateIdentity(candidate, {
      externalSystem: 'kentucky_mco',
      externalRecordId: 'ext_wrong_patient',
      matchMethod: 'deterministic',
      matchConfidence: 1,
      strongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      name: 'Marla Baker',
      dateOfBirth: '1968-10-03',
      patientConfirmed: false,
    })

    expect(result.decision).toBe('navigator_review')
    expect(result.queueReason).toBe('identity_match_review')
    expect(result.matchQuality.matchedOn).toEqual(['payer_member_id'])
    expect(result.matchQuality.demographicCorroborated).toBe(false)
    expect(canAutonomouslyUseExternalRecord(result)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/identity-corroboration.test.ts`
Expected: FAIL because `src/lib/identity-corroboration.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Add the exported functions and result types. Extend `NavigatorQueueReason` with `identity_match_review`, assign it `soon` priority, and add the hub label.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/identity-corroboration.test.ts src/lib/retinopathy-protocol.test.ts`
Expected: PASS.

### Task 2: Backend Action and Route

**Files:**
- Modify: `server/actions.test.ts`
- Modify: `server/actions.ts`
- Modify: `server/routes.test.ts`
- Modify: `server/routes.ts`

**Interfaces:**
- Produces: `recordIdentityCorroboration(state, input): { state, corroboration }`
- Produces: `POST /api/patients/:patientId/identity/corroborate`
- Consumes: `corroborateIdentity` result and existing `navigatorQueue` plus audit appenders

- [ ] **Step 1: Write failing backend tests**

Add an action test proving a recycled member ID creates an `identity_match_review` queue item, no protocol event, and a blocked audit event. Add a route test proving the API returns the same decision and persists the queue item.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/actions.test.ts server/routes.test.ts`
Expected: FAIL because `recordIdentityCorroboration` and the route do not exist.

- [ ] **Step 3: Write minimal implementation**

Add the action, input parsing, queue creation on `navigator_review`, and audit event details. The action should not emit protocol events for uncorroborated identity matches.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/actions.test.ts server/routes.test.ts`
Expected: PASS.

### Task 3: Proof Command and Ledger Update

**Files:**
- Create: `scripts/rhtp-identity-gate.ts`
- Modify: `package.json`
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-REAL-PHI-GATES.md`
- Create: `docs/ops/red-team-results/2026-07-04-e2-identity-gate.md`

**Interfaces:**
- Produces: `npm run identity:gate`
- Consumes: backend action and pure identity corroboration module

- [ ] **Step 1: Write proof command**

The command should run deterministic cases for strong-ID-only mismatch, corroborated pre-confirmation match, and post-confirmation allowed use.

- [ ] **Step 2: Run command**

Run: `npm run identity:gate`
Expected: PASS with `wrong-patient autonomous outreach blocked`.

- [ ] **Step 3: Update docs honestly**

Record E2 as local control verified with residual production MPI/ingest integration still blocking real-PHI readiness. Keep P3/P4 blocked.

- [ ] **Step 4: Full verification and commit**

Run: `npm test`, `npm run safety:gate`, `npm run voice:redteam`, `npm run identity:gate`, `npm run build`, `npm run ops:status`, `git diff --check`.
Commit: `feat: add identity corroboration gate`.
