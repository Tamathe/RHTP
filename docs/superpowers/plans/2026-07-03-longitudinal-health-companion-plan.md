# Longitudinal Health Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a patient-facing Health tab for blood pressure, glucose, medications, simulated device connection, and Sandy chat prompts grounded in patient-specific history.

**Architecture:** Add typed static chronic-care content in `src/lib/longitudinal-health.ts`, then render it in a new `HealthCompanionScreen` inside the existing phone app. Keep all integrations simulated and keep safety copy visible. Tests cover the content helper, the screen, and the new phone tab.

**Tech Stack:** React 18, TypeScript 5.7 strict mode, Vite 8, Vitest 4, React Testing Library, lucide-react, Tailwind CSS 4.

## Global Constraints

- Work only in `C:\Projects\rhtp-prototype`.
- Use seed/demo data only; do not add real device integrations, real PHI, real EMR integration, or real model calls.
- Do not provide medication dosing changes or diagnostic advice.
- Keep the existing retinopathy voice flow working.
- Use TDD: write failing tests first, implement the smallest passing change, then verify.

---

### Task 1: Add Typed Chronic-Care Content

**Files:**
- Create: `src/lib/longitudinal-health.ts`
- Create: `src/lib/longitudinal-health.test.ts`

**Interfaces:**
- Produces: `healthCompanionSections`
- Produces: `getHealthCompanionSection(id)`
- Produces section IDs: `blood-pressure`, `glucose`, `medications`, `ask-sandy`

- [ ] Write tests for section names, simulated connectors, nighttime hyperglycemia insight, and medication safety boundary.
- [ ] Implement the typed content helper.
- [ ] Run `npm test -- src/lib/longitudinal-health.test.ts`.

### Task 2: Add Health Companion Screen

**Files:**
- Create: `src/components/phone/HealthCompanionScreen.tsx`
- Create: `src/components/phone/HealthCompanionScreen.test.tsx`

**Interfaces:**
- Consumes: `healthCompanionSections`
- Produces: segmented patient-facing health pages.

- [ ] Write screen tests for BP education, glucose insight, medications, and Sandy knowledge bundle.
- [ ] Implement the screen with compact buttons and visible safety copy.
- [ ] Run `npm test -- src/components/phone/HealthCompanionScreen.test.tsx`.

### Task 3: Add Health Tab To Phone App

**Files:**
- Modify: `src/components/phone/PhoneApp.tsx`
- Modify: `src/components/phone/PhoneApp.test.tsx`

**Interfaces:**
- Consumes: `HealthCompanionScreen`
- Produces: `PhoneScreen = 'voice' | 'health' | 'today' | 'why' | 'find' | 'plan' | 'result'`

- [ ] Write/update tests proving the Health tab renders and the default Voice tab remains.
- [ ] Add Health to phone navigation after Voice.
- [ ] Run `npm test -- src/components/phone/PhoneApp.test.tsx src/components/phone/HealthCompanionScreen.test.tsx`.

### Task 4: Verify And Commit

**Files:**
- Modify: `docs/superpowers/sprints/2026-07-03-longitudinal-health-companion-sprint.md`

**Verification:**
- Run `npm test`.
- Run `npm run build`.
- Browser check `http://127.0.0.1:5173/`, click `Health`, and confirm BP, Glucose, Meds, and Ask Sandy sections render.

## Acceptance Checklist

- [ ] Patient can open a Health tab.
- [ ] Blood pressure page teaches why BP matters and shows simulated cuff connection.
- [ ] Glucose page shows simulated CGM connection and nighttime hyperglycemia follow-up suggestion.
- [ ] Medications page tracks meds and smart pill bottle support without dosing advice.
- [ ] Ask Sandy page frames a patient-specific knowledge bundle and safe chat prompts.
- [ ] Existing Voice default remains unchanged.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
