# Health Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local in-app Alert Center for medication reminders, blood pressure checks, and symptom logging inside the Health tab.

**Architecture:** Add typed alert seed data and pure state helpers in `src/lib/health-alerts.ts`, then render and manage alert interactions in a focused `HealthAlertCenter` component. Keep alerts local to the screen for this slice while making the model backend-ready.

**Tech Stack:** React 18, TypeScript 5.7 strict mode, Vite 8, Vitest 4, React Testing Library, lucide-react, Tailwind CSS 4.

## Global Constraints

- Work only in `C:\Projects\rhtp-prototype`.
- Use local simulated alerts only; do not add SMS, push, email, browser notification permission, real PHI, or real device integrations.
- Alerts may remind, prompt logging, and record local actions. Alerts may not diagnose, change medications, or replace clinician instructions.
- Use TDD: write failing tests first, implement the smallest passing change, then verify.

---

### Task 1: Add Alert Model And Helpers

**Files:**
- Create: `src/lib/health-alerts.ts`
- Create: `src/lib/health-alerts.test.ts`

**Interfaces:**
- Produces: `seedHealthAlerts`
- Produces: `markAlertDone(alerts, alertId)`
- Produces: `snoozeAlert(alerts, alertId)`
- Produces: `alertCounts(alerts)`

### Task 2: Add Alert Center UI

**Files:**
- Create: `src/components/phone/HealthAlertCenter.tsx`
- Create: `src/components/phone/HealthAlertCenter.test.tsx`
- Modify: `src/components/phone/HealthCompanionScreen.tsx`
- Modify: `src/components/phone/HealthCompanionScreen.test.tsx`

**Interfaces:**
- Consumes: health alert helpers.
- Produces: patient-facing Alert Center with due/upcoming/completed display, mark done, snooze, and safety copy.

### Task 3: Verify And Close

**Files:**
- Modify: `docs/superpowers/sprints/2026-07-04-health-alerts-sprint.md`

**Verification:**
- Run `npm test`.
- Run `npm run build`.
- Browser check `http://127.0.0.1:5173/`, click `Health`, and confirm Alert Center behavior.

## Acceptance Checklist

- [ ] Health tab shows Alert Center.
- [ ] Medication, blood pressure, and symptom alerts are visible.
- [ ] Patient can mark an alert done.
- [ ] Patient can snooze an alert.
- [ ] Alert counts update after actions.
- [ ] Safety boundary is visible.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
