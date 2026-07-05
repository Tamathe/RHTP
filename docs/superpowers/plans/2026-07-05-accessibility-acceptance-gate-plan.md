# Accessibility Acceptance Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Appendix B.4 accessibility from tracked backlog to a local no-PHI acceptance gate for the stakeholder prototype.

**Architecture:** Add patient `accessibilityPrefs`, pack education accessibility attestations, and a pure policy module that maps patient preferences to concrete rendering affordances. Add a server gate and npm command, then wire it into the local release gate and ledger.

**Tech Stack:** TypeScript, React, Vitest, tsx, existing release-gate pattern.

## Global Constraints

- The stakeholder prototype remains no-PHI and synthetic/local seed data only.
- The gate proves a local demo accessibility floor; it does not claim full production WCAG certification.
- Patient-facing rendering must expose large-text, high-contrast, screen-reader, keyboard, and read-aloud affordance metadata when `accessibilityPrefs` requires them.
- `RHTP_REAL_PHI` stays off.
- Do not push unless explicitly requested.

---

### Task 1: Accessibility Policy And Rendering Hook

**Files:**
- Create: `src/lib/accessibility-policy.ts`
- Create: `src/lib/accessibility-policy.test.ts`
- Modify: `src/types.ts`
- Modify: `src/data/seed.ts`
- Modify: `src/lib/protocol-packs.ts`
- Modify: `src/components/phone/PhoneApp.tsx`
- Modify: `src/components/phone/PhoneApp.test.tsx`

**Interfaces:**
- Consumes: `Patient.accessibilityPrefs`, `Patient.language`, and `ProtocolPack.education.accessibility`.
- Produces: `accessibilityProfileForPatient(patient)`, `educationMeetsAccessibilityFloor(education, patient)`, and rendered phone-shell affordance attributes.

- [x] **Step 1: Write failing tests**

Run: `npx vitest run src/lib/accessibility-policy.test.ts src/components/phone/PhoneApp.test.tsx`

Expected: FAIL because `src/lib/accessibility-policy.ts` does not exist and the phone shell does not render accessibility affordance attributes.

- [x] **Step 2: Implement types, seed, and policy**

Add `AccessibilityPreference`, `AccessibilityAttestation`, `language`, and `accessibilityPrefs` to the local model. Add WCAG 2.1 AA attestations to protocol-pack education modules and map patient preferences to concrete rendering classes/attributes.

- [x] **Step 3: Verify**

Run: `npx vitest run src/lib/accessibility-policy.test.ts src/components/phone/PhoneApp.test.tsx src/lib/protocol-packs.test.ts`

Expected: PASS.

### Task 2: Accessibility Gate And Release Wiring

**Files:**
- Create: `server/accessibility-gate.ts`
- Create: `server/accessibility-gate.test.ts`
- Create: `scripts/rhtp-accessibility-gate.ts`
- Modify: `package.json`
- Modify: `server/local-release-gate.ts`
- Modify: `server/local-release-gate.test.ts`
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Modify: `docs/ops/red-team-results/2026-07-04-local-release-gate.md`

**Interfaces:**
- Consumes: policy helpers, seed patients, protocol packs.
- Produces: `npm run accessibility:gate` and release-gate command coverage.

- [x] **Step 1: Write failing gate test**

Run: `npx vitest run server/accessibility-gate.test.ts`

Expected: FAIL because `server/accessibility-gate.ts` does not exist.

- [x] **Step 2: Implement gate and script**

Gate cases:
- demo patients declare language and accessibility preferences
- pack education modules carry WCAG 2.1 AA attestations
- read-aloud/large-text/screen-reader/keyboard/high-contrast preferences are satisfied
- phone rendering profile exposes concrete affordance classes/attributes
- production accessibility residual is locally verified without becoming a demo blocker

- [x] **Step 3: Wire and verify release**

Run:

```powershell
npx vitest run src/lib/accessibility-policy.test.ts src/components/phone/PhoneApp.test.tsx server/accessibility-gate.test.ts server/local-release-gate.test.ts
npm run accessibility:gate
npm run release:gate
```

Expected: PASS, with release commands incremented by one.

Verified 2026-07-05:
- `npx vitest run src/lib/accessibility-policy.test.ts src/components/phone/PhoneApp.test.tsx server/accessibility-gate.test.ts src/lib/protocol-packs.test.ts server/local-release-gate.test.ts scripts/rhtp-status.test.ts server/spec-residual-gate.test.ts server/stakeholder-release-packet.test.ts` -> 8 files, 24 tests passed.
- `npm run accessibility:gate` -> 5/5 cases passed.
- `npm run spec:gate` -> 5/5 cases passed.
- `npm run ops:status -- --residuals` -> B4 accessibility is `local_control_verified_production_backlog`, demo blocker false.
- `npm run release:gate` -> Validation 3/3, Commands 24/24.
