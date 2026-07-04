# Kentucky SDOH Resource Network Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a patient-facing Kentucky SDOH resource finder with provenance and navigator handoff.

**Architecture:** Add a local resource matcher library that behaves like a future kynect/211 adapter. Render it through a focused Plan-screen component. Add one store action that creates a structured navigator queue item for resource connection help.

**Tech Stack:** React, TypeScript strict mode, Zustand, Vitest, Testing Library, lucide-react.

## Global Constraints

- Keep source data Kentucky-specific and provenance-visible.
- Do not create live kynect/211 referrals in this prototype.
- Do not guarantee availability or eligibility.
- Keep the adapter swappable for official API, partner feed, or cached catalog integration later.
- Follow tests-first implementation.

---

### Task 1: Resource Matcher

**Files:**
- Create: `src/lib/kentucky-sdoh-resources.test.ts`
- Create: `src/lib/kentucky-sdoh-resources.ts`

**Interfaces:**
- Produces: `findKentuckyResources(input: KentuckySdohResourceSearch): KentuckySdohResource[]`
- Produces: `sdohNeedOptions: readonly { id: SdohNeedType; label: string }[]`

- [ ] **Step 1: Write failing tests**

Test county prioritization, need filtering, and statewide fallback.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/lib/kentucky-sdoh-resources.test.ts`
Expected: fail because `kentucky-sdoh-resources.ts` does not exist.

- [ ] **Step 3: Implement matcher**

Create seed resources for kynect/211, LKLP transportation, Perry County food resources, and Perry County housing resources. Filter resources by need and county, sorting county-specific matches before statewide matches.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/lib/kentucky-sdoh-resources.test.ts`
Expected: pass.

### Task 2: Navigator Handoff

**Files:**
- Modify: `src/types.ts`
- Modify: `src/store/useStore.ts`
- Modify: `src/store/useStore.test.ts`
- Modify: `src/components/hub/NavigatorQueueView.tsx`
- Modify: `src/components/hub/NavigatorQueueView.test.tsx`

**Interfaces:**
- Consumes: `KentuckySdohResource`
- Produces: `requestSdohResourceHelp(patientId: string, resourceId: string, needType: SdohNeedType): void`

- [ ] **Step 1: Write failing store and queue tests**

Assert resource help creates one open navigator queue item with reason `sdoh_resource_connection`, routine priority, and source-aware summary.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/store/useStore.test.ts src/components/hub/NavigatorQueueView.test.tsx`
Expected: fail because store action and queue reason are missing.

- [ ] **Step 3: Implement store handoff**

Add `sdoh_resource_connection` to `NavigatorQueueReason`, map it in the queue label, and implement `requestSdohResourceHelp` using the resource matcher catalog.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/store/useStore.test.ts src/components/hub/NavigatorQueueView.test.tsx`
Expected: pass.

### Task 3: Patient Resource Panel

**Files:**
- Create: `src/components/phone/KentuckyResourceFinder.test.tsx`
- Create: `src/components/phone/KentuckyResourceFinder.tsx`
- Modify: `src/components/phone/PlanBuilderScreen.tsx`
- Modify: `src/components/PlanBuilderScreen.test.tsx`

**Interfaces:**
- Consumes: `findKentuckyResources`
- Consumes: `requestSdohResourceHelp`

- [ ] **Step 1: Write failing UI tests**

Assert Plan screen shows Kentucky resource matches, can switch needs, and can ask navigator to connect.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/components/phone/KentuckyResourceFinder.test.tsx src/components/PlanBuilderScreen.test.tsx`
Expected: fail because component is missing.

- [ ] **Step 3: Implement UI**

Render need buttons, resource cards, provenance text, caveat copy, and "Ask navigator to connect me" buttons.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/components/phone/KentuckyResourceFinder.test.tsx src/components/PlanBuilderScreen.test.tsx`
Expected: pass.

### Task 4: Verification And Closeout

**Files:**
- Modify: `docs/superpowers/sprints/2026-07-04-kentucky-sdoh-resource-network-sprint.md`

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/lib/kentucky-sdoh-resources.test.ts src/store/useStore.test.ts src/components/phone/KentuckyResourceFinder.test.tsx src/components/PlanBuilderScreen.test.tsx src/components/hub/NavigatorQueueView.test.tsx`
Expected: pass.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: pass.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: pass.

- [ ] **Step 4: Browser verify**

Open `http://127.0.0.1:5173/`, click `Plan`, confirm resource matches render, switch to Food, click navigator help, then confirm the Hub queue shows SDOH resource connection.

- [ ] **Step 5: Commit**

Commit implementation and documentation with `feat: add kentucky sdoh resources`.
