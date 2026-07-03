# RHTP Production-Shaped Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current RHTP retinopathy demo into a P0 production-shaped prototype where Sandy is voice-first, every patient-facing claim shows provenance, autonomous outreach is protocol-bound, red flags escalate, and the navigator queue is the primary care-team surface.

**Architecture:** Keep the app as a client-only Vite/React prototype for P0, but introduce the production rails as typed in-memory concepts: source facts, consent, protocol events, voice turns, red-flag events, and navigator queue items. Business rules live in pure `src/lib/*` modules, Zustand remains the state boundary, and React components render the phone and navigator surfaces from those typed records.

**Tech Stack:** React 18, TypeScript 5.7 strict mode, Zustand 5, Vite 8, Vitest 4, React Testing Library, Tailwind CSS 4, lucide-react.

## Global Constraints

- Work only in `C:\Projects\rhtp-prototype`.
- P0 stays diabetic-retinopathy only.
- P0 uses seed data and deterministic UI simulation; do not add a backend, database, real HIE, real claims feed, real EMR integration, or real OpenAI voice session.
- No secrets, API keys, or real patient data.
- Keep all new state strongly typed; do not use `any`.
- Every patient-facing clinical or operational claim added in P0 must display source provenance.
- Sandy may explain, remind, collect barriers, match sites, confirm a plan, and escalate; Sandy may not diagnose, change medications, reassure red flags, or close clinical concerns outside the protocol.
- Navigator queue is the default hub view and the first returned-information customer.
- Preserve the existing golden loop: patient action on the phone updates the hub without a page reload.
- Use TDD: write failing tests first, implement the smallest passing change, then commit.

---

## File Structure

- `src/types.ts`: expand shared domain types for P0 production rails.
- `src/lib/retinopathy-protocol.ts`: pure protocol state machine and queue-priority helpers.
- `src/lib/retinopathy-protocol.test.ts`: protocol transition coverage.
- `src/lib/safety.ts`: pure safety boundary and red-flag screening helpers.
- `src/lib/safety.test.ts`: safety and red-flag tests.
- `src/data/seed.ts`: seed patient provenance, consent, protocol events, voice turns, red flags, and navigator queue.
- `src/data/seed.test.ts`: verify seeded production rails are coherent.
- `src/store/useStore.ts`: add voice/outreach actions and wire existing actions to protocol events and navigator queue items.
- `src/store/useStore.test.ts`: verify production rail state transitions.
- `src/components/phone/ProvenanceStrip.tsx`: reusable patient-facing provenance strip.
- `src/components/phone/ProvenanceStrip.test.tsx`: provenance rendering tests.
- `src/components/phone/SafetyBoundaryCard.tsx`: patient-facing Sandy limits and escalation copy.
- `src/components/phone/SafetyBoundaryCard.test.tsx`: safety copy tests.
- `src/components/phone/VoiceCompanionScreen.tsx`: voice-first Sandy simulation and transcript surface.
- `src/components/phone/VoiceCompanionScreen.test.tsx`: voice-first interaction tests.
- `src/components/phone/TodayScreen.tsx`: add provenance and voice-first next action.
- `src/components/phone/WhyItMattersScreen.tsx`: add provenance for the retinopathy claim.
- `src/components/phone/PhoneApp.tsx`: add `voice` as the default screen.
- `src/components/hub/NavigatorQueueView.tsx`: primary navigator work queue.
- `src/components/hub/NavigatorQueueView.test.tsx`: queue rendering tests.
- `src/components/hub/HubShell.tsx`: make navigator queue the default hub view.
- `src/components/SideBySide.test.tsx`: update cross-surface integration tests for voice-first queue creation.
- `src/golden-path.test.tsx`: update end-to-end golden path for voice outreach, barrier, queue, scheduling, and red flag escalation.
- `docs/superpowers/sprints/2026-07-03-rhtp-production-architecture-sprint.md`: mark the architecture spec approved and the P0 plan written.

---

### Task 1: Add Protocol Rail Types And State Machine

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/retinopathy-protocol.ts`
- Create: `src/lib/retinopathy-protocol.test.ts`

**Interfaces:**
- Produces: `ProtocolStatus`, `ProtocolEventType`, `ProtocolEvent`, `NavigatorQueueItem`, `NavigatorQueueReason`, `NavigatorQueuePriority`
- Produces: `nextProtocolStatus(current: ProtocolStatus, eventType: ProtocolEventType, outcome?: ResultOutcome): ProtocolStatus`
- Produces: `queueReasonForBarrier(type: BarrierType): NavigatorQueueReason`
- Produces: `priorityForQueueReason(reason: NavigatorQueueReason): NavigatorQueuePriority`

- [ ] **Step 1: Write the failing protocol tests**

Create `src/lib/retinopathy-protocol.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { nextProtocolStatus, priorityForQueueReason, queueReasonForBarrier } from './retinopathy-protocol'

describe('nextProtocolStatus', () => {
  it('moves from imported gap to explained outreach', () => {
    expect(nextProtocolStatus('identified', 'patient_consented')).toBe('patient_contactable')
    expect(nextProtocolStatus('patient_contactable', 'sandy_explained_gap')).toBe('explained')
  })

  it('moves patient barriers and plan confirmation through the autonomous outreach path', () => {
    expect(nextProtocolStatus('explained', 'barrier_reported')).toBe('barrier_collected')
    expect(nextProtocolStatus('barrier_collected', 'site_matched')).toBe('site_matched')
    expect(nextProtocolStatus('site_matched', 'appointment_confirmed')).toBe('scheduled')
  })

  it('routes result imports to the correct close-loop state', () => {
    expect(nextProtocolStatus('scheduled', 'result_imported', 'normal')).toBe('normal_closed')
    expect(nextProtocolStatus('scheduled', 'result_imported', 'abnormal')).toBe('abnormal_referral_needed')
    expect(nextProtocolStatus('scheduled', 'result_imported', 'ungradable')).toBe('repeat_needed')
  })

  it('routes red flags and already-completed claims to navigator review', () => {
    expect(nextProtocolStatus('explained', 'red_flag_reported')).toBe('navigator_review')
    expect(nextProtocolStatus('explained', 'already_completed_claimed')).toBe('navigator_review')
  })

  it('keeps the current state for unsupported event combinations', () => {
    expect(nextProtocolStatus('normal_closed', 'question_answered')).toBe('normal_closed')
  })
})

describe('navigator queue helpers', () => {
  it('maps barriers to queue reasons', () => {
    expect(queueReasonForBarrier('transportation')).toBe('transportation_barrier')
    expect(queueReasonForBarrier('cost')).toBe('cost_barrier')
    expect(queueReasonForBarrier('after_hours')).toBe('after_hours_needed')
    expect(queueReasonForBarrier('not_ready')).toBe('patient_not_ready')
    expect(queueReasonForBarrier('already_completed')).toBe('already_completed_needs_reconciliation')
  })

  it('keeps red flags urgent and common barriers routine or soon', () => {
    expect(priorityForQueueReason('red_flag_symptom')).toBe('urgent')
    expect(priorityForQueueReason('abnormal_result_referral')).toBe('soon')
    expect(priorityForQueueReason('transportation_barrier')).toBe('routine')
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/lib/retinopathy-protocol.test.ts`

Expected: FAIL because `src/lib/retinopathy-protocol.ts` does not exist and the new types do not exist.

- [ ] **Step 3: Add the new shared types**

Append these exports to `src/types.ts`:

```ts
export type SourceKind =
  | 'hie'
  | 'claims'
  | 'site_feed'
  | 'patient_reported'
  | 'navigator_review'
  | 'prototype_seed'

export type SourceConfidence = 'confirmed' | 'probable' | 'patient_reported' | 'needs_review'

export interface SourceFact {
  id: string
  patientId: string
  label: string
  value: string
  sourceKind: SourceKind
  sourceName: string
  retrievedAt: string
  effectiveDate: string
  confidence: SourceConfidence
}

export type ConsentStatus = 'active' | 'missing' | 'revoked'

export interface PatientConsent {
  id: string
  patientId: string
  status: ConsentStatus
  scope: string
  updatedAt: string
}

export type ProtocolStatus =
  | 'identified'
  | 'patient_contactable'
  | 'explained'
  | 'barrier_collected'
  | 'site_matched'
  | 'scheduled'
  | 'completed'
  | 'normal_closed'
  | 'abnormal_referral_needed'
  | 'repeat_needed'
  | 'navigator_review'
  | 'closed_by_reconciliation'

export type ProtocolEventType =
  | 'care_gap_imported'
  | 'patient_consented'
  | 'sandy_explained_gap'
  | 'question_answered'
  | 'barrier_reported'
  | 'red_flag_reported'
  | 'site_matched'
  | 'appointment_confirmed'
  | 'already_completed_claimed'
  | 'result_imported'
  | 'navigator_reviewed'
  | 'referral_scheduled'
  | 'repeat_scheduled'

export type ProtocolActor = 'sandy' | 'patient' | 'navigator' | 'system'

export interface ProtocolEvent {
  id: string
  patientId: string
  type: ProtocolEventType
  label: string
  status: ProtocolStatus
  createdAt: string
  actor: ProtocolActor
  sourceFactIds: string[]
}

export type VoiceSpeaker = 'patient' | 'sandy'
export type VoiceTurnSafety = 'normal' | 'fallback' | 'red_flag'

export interface VoiceTurn {
  id: string
  patientId: string
  speaker: VoiceSpeaker
  text: string
  createdAt: string
  mode: 'voice' | 'text'
  safety: VoiceTurnSafety
}

export interface RedFlagEvent {
  id: string
  patientId: string
  symptom: string
  action: string
  createdAt: string
  status: 'open' | 'reviewed'
}

export type NavigatorQueueReason =
  | 'transportation_barrier'
  | 'cost_barrier'
  | 'after_hours_needed'
  | 'patient_not_ready'
  | 'already_completed_needs_reconciliation'
  | 'red_flag_symptom'
  | 'abnormal_result_referral'
  | 'ungradable_repeat_needed'
  | 'nonresponse'
  | 'low_confidence_identity_or_gap_match'

export type NavigatorQueuePriority = 'routine' | 'soon' | 'urgent'

export interface NavigatorQueueItem {
  id: string
  patientId: string
  reason: NavigatorQueueReason
  priority: NavigatorQueuePriority
  summary: string
  suggestedAction: string
  status: 'open' | 'done'
  createdAt: string
  sourceEventIds: string[]
}
```

- [ ] **Step 4: Add the protocol implementation**

Create `src/lib/retinopathy-protocol.ts`:

```ts
import type {
  BarrierType,
  NavigatorQueuePriority,
  NavigatorQueueReason,
  ProtocolEventType,
  ProtocolStatus,
  ResultOutcome,
} from '../types'

const EVENT_TRANSITIONS: Partial<Record<ProtocolEventType, ProtocolStatus>> = {
  care_gap_imported: 'identified',
  patient_consented: 'patient_contactable',
  sandy_explained_gap: 'explained',
  question_answered: 'explained',
  barrier_reported: 'barrier_collected',
  red_flag_reported: 'navigator_review',
  site_matched: 'site_matched',
  appointment_confirmed: 'scheduled',
  already_completed_claimed: 'navigator_review',
  navigator_reviewed: 'closed_by_reconciliation',
  referral_scheduled: 'abnormal_referral_needed',
  repeat_scheduled: 'repeat_needed',
}

const RESULT_TRANSITIONS: Record<ResultOutcome, ProtocolStatus> = {
  normal: 'normal_closed',
  abnormal: 'abnormal_referral_needed',
  ungradable: 'repeat_needed',
}

export function nextProtocolStatus(
  current: ProtocolStatus,
  eventType: ProtocolEventType,
  outcome?: ResultOutcome,
): ProtocolStatus {
  if (eventType === 'result_imported') {
    return outcome ? RESULT_TRANSITIONS[outcome] : current
  }

  if (current === 'normal_closed' || current === 'closed_by_reconciliation') {
    return current
  }

  return EVENT_TRANSITIONS[eventType] ?? current
}

export function queueReasonForBarrier(type: BarrierType): NavigatorQueueReason {
  const map: Record<BarrierType, NavigatorQueueReason> = {
    transportation: 'transportation_barrier',
    cost: 'cost_barrier',
    after_hours: 'after_hours_needed',
    not_ready: 'patient_not_ready',
    already_completed: 'already_completed_needs_reconciliation',
  }

  return map[type]
}

export function priorityForQueueReason(reason: NavigatorQueueReason): NavigatorQueuePriority {
  if (reason === 'red_flag_symptom') return 'urgent'
  if (
    reason === 'abnormal_result_referral' ||
    reason === 'ungradable_repeat_needed' ||
    reason === 'low_confidence_identity_or_gap_match'
  ) {
    return 'soon'
  }

  return 'routine'
}
```

- [ ] **Step 5: Run the focused test and commit**

Run: `npm test -- src/lib/retinopathy-protocol.test.ts`

Expected: PASS.

Then commit:

```bash
git add src/types.ts src/lib/retinopathy-protocol.ts src/lib/retinopathy-protocol.test.ts
git commit -m "feat: add retinopathy protocol rail"
```

---

### Task 2: Add Sandy Safety Boundary Helpers

**Files:**
- Create: `src/lib/safety.ts`
- Create: `src/lib/safety.test.ts`

**Interfaces:**
- Produces: `SafetyAction`, `SafetyScreeningResult`
- Produces: `screenPatientMessage(input: string): SafetyScreeningResult`
- Produces: `isAutonomousActionAllowed(action: SafetyAction): boolean`

- [ ] **Step 1: Write the failing safety tests**

Create `src/lib/safety.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isAutonomousActionAllowed, screenPatientMessage } from './safety'

describe('screenPatientMessage', () => {
  it('detects sudden vision loss as a red flag', () => {
    const result = screenPatientMessage('I suddenly lost vision in my left eye')

    expect(result.category).toBe('red_flag')
    expect(result.queueReason).toBe('red_flag_symptom')
    expect(result.patientCopy).toMatch(/urgent/i)
  })

  it('detects flashes, floaters, and eye pain as red flags', () => {
    expect(screenPatientMessage('I see new flashes and floaters').category).toBe('red_flag')
    expect(screenPatientMessage('My eye pain is getting worse').category).toBe('red_flag')
  })

  it('routes diagnosis and medication questions to fallback', () => {
    expect(screenPatientMessage('Do I have diabetic retinopathy?').category).toBe('off_protocol')
    expect(screenPatientMessage('Should I change my insulin?').category).toBe('off_protocol')
  })

  it('keeps normal logistics questions autonomous', () => {
    const result = screenPatientMessage('Can you help me find a Saturday appointment?')

    expect(result.category).toBe('normal')
    expect(result.queueReason).toBeUndefined()
  })
})

describe('isAutonomousActionAllowed', () => {
  it('allows protocol actions Sandy is permitted to take', () => {
    expect(isAutonomousActionAllowed('answer_education')).toBe(true)
    expect(isAutonomousActionAllowed('collect_barrier')).toBe(true)
    expect(isAutonomousActionAllowed('match_site')).toBe(true)
    expect(isAutonomousActionAllowed('confirm_plan')).toBe(true)
  })

  it('blocks clinical judgment actions', () => {
    expect(isAutonomousActionAllowed('diagnose_symptom')).toBe(false)
    expect(isAutonomousActionAllowed('change_medication')).toBe(false)
    expect(isAutonomousActionAllowed('reassure_red_flag')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/lib/safety.test.ts`

Expected: FAIL because `src/lib/safety.ts` does not exist.

- [ ] **Step 3: Add the safety helper implementation**

Create `src/lib/safety.ts`:

```ts
import type { NavigatorQueueReason } from '../types'

export type SafetyAction =
  | 'answer_education'
  | 'collect_barrier'
  | 'match_site'
  | 'confirm_plan'
  | 'diagnose_symptom'
  | 'change_medication'
  | 'reassure_red_flag'

export interface SafetyScreeningResult {
  category: 'normal' | 'red_flag' | 'off_protocol'
  patientCopy: string
  navigatorSummary: string
  queueReason?: NavigatorQueueReason
}

const RED_FLAG_PATTERNS = [
  /sudden(?:ly)?\s+(?:lost|loss|lose).{0,24}vision/i,
  /new\s+(?:flashes|floaters)/i,
  /flashes?\s+and\s+floaters?/i,
  /eye\s+pain/i,
  /curtain.{0,24}vision/i,
]

const OFF_PROTOCOL_PATTERNS = [
  /do i have/i,
  /diagnos/i,
  /change.{0,24}(?:insulin|medicine|medication|metformin)/i,
  /stop.{0,24}(?:insulin|medicine|medication|metformin)/i,
  /should i take/i,
]

export function screenPatientMessage(input: string): SafetyScreeningResult {
  if (RED_FLAG_PATTERNS.some((pattern) => pattern.test(input))) {
    return {
      category: 'red_flag',
      queueReason: 'red_flag_symptom',
      patientCopy:
        'That could be urgent. Sandy cannot diagnose this, so a navigator should help you get human guidance now.',
      navigatorSummary: `Patient reported a possible vision red flag: "${input}"`,
    }
  }

  if (OFF_PROTOCOL_PATTERNS.some((pattern) => pattern.test(input))) {
    return {
      category: 'off_protocol',
      patientCopy:
        'Sandy can help with screening steps, barriers, and reminders, but clinical advice needs a care-team review.',
      navigatorSummary: `Patient asked an off-protocol clinical question: "${input}"`,
    }
  }

  return {
    category: 'normal',
    patientCopy: 'Sandy can keep helping with the retinopathy screening plan.',
    navigatorSummary: `Patient message stayed inside the retinopathy outreach protocol: "${input}"`,
  }
}

export function isAutonomousActionAllowed(action: SafetyAction): boolean {
  return (
    action === 'answer_education' ||
    action === 'collect_barrier' ||
    action === 'match_site' ||
    action === 'confirm_plan'
  )
}
```

- [ ] **Step 4: Run the focused test and commit**

Run: `npm test -- src/lib/safety.test.ts`

Expected: PASS.

Then commit:

```bash
git add src/lib/safety.ts src/lib/safety.test.ts
git commit -m "feat: add Sandy safety boundary"
```

---

### Task 3: Seed Consent, Provenance, Protocol Events, And Voice Turns

**Files:**
- Modify: `src/data/seed.ts`
- Modify: `src/data/seed.test.ts`

**Interfaces:**
- Consumes: types from Task 1
- Produces: `SeedState.sourceFacts`, `SeedState.consents`, `SeedState.protocolEvents`, `SeedState.voiceTurns`, `SeedState.redFlagEvents`, `SeedState.navigatorQueue`

- [ ] **Step 1: Write failing seed tests**

Add these tests to `src/data/seed.test.ts`:

```ts
import { HERO_ID, seed } from './seed'

describe('production-shaped seed rails', () => {
  it('gives the hero patient consent and trusted source facts', () => {
    expect(seed.consents.find((consent) => consent.patientId === HERO_ID)?.status).toBe('active')
    expect(seed.sourceFacts.filter((fact) => fact.patientId === HERO_ID)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceKind: 'hie', label: 'Diabetes diagnosis' }),
        expect.objectContaining({ sourceKind: 'claims', label: 'Retinal screening gap' }),
        expect.objectContaining({ sourceKind: 'site_feed', label: 'Screening site availability' }),
      ]),
    )
  })

  it('starts the hero protocol with imported gap and consent events', () => {
    expect(seed.protocolEvents.filter((event) => event.patientId === HERO_ID)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'care_gap_imported', status: 'identified' }),
        expect.objectContaining({ type: 'patient_consented', status: 'patient_contactable' }),
      ]),
    )
  })

  it('starts without navigator queue noise for the hero patient', () => {
    expect(seed.navigatorQueue.filter((item) => item.patientId === HERO_ID)).toHaveLength(0)
    expect(seed.redFlagEvents).toHaveLength(0)
  })
})
```

If `src/data/seed.test.ts` already imports `HERO_ID` and `seed`, reuse the existing import line instead of adding a duplicate import.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/data/seed.test.ts`

Expected: FAIL because `SeedState` does not include the new arrays.

- [ ] **Step 3: Extend the seed state interface**

In `src/data/seed.ts`, expand the type import and `SeedState`:

```ts
import type {
  Barrier,
  CarePlanTask,
  HubMetric,
  NavigatorQueueItem,
  NavigatorTask,
  OutreachEvent,
  Patient,
  PatientConsent,
  ProtocolEvent,
  RedFlagEvent,
  Referral,
  ScreeningGap,
  ScreeningResult,
  ScreeningSite,
  SourceFact,
  TimelineEntry,
  VoiceTurn,
} from '../types'

export interface SeedState {
  patients: Patient[]
  sites: ScreeningSite[]
  gaps: ScreeningGap[]
  barriers: Barrier[]
  carePlanTasks: CarePlanTask[]
  navigatorTasks: NavigatorTask[]
  results: ScreeningResult[]
  referrals: Referral[]
  outreach: OutreachEvent[]
  timeline: TimelineEntry[]
  metrics: HubMetric[]
  sourceFacts: SourceFact[]
  consents: PatientConsent[]
  protocolEvents: ProtocolEvent[]
  voiceTurns: VoiceTurn[]
  redFlagEvents: RedFlagEvent[]
  navigatorQueue: NavigatorQueueItem[]
}
```

- [ ] **Step 4: Add hero provenance and protocol seed records**

Add these constants near `HERO_ID` in `src/data/seed.ts`:

```ts
const HERO_SOURCE_FACTS: SourceFact[] = [
  {
    id: 'fact_ruth_diabetes_hie',
    patientId: HERO_ID,
    label: 'Diabetes diagnosis',
    value: 'Type 2 diabetes on imported problem evidence',
    sourceKind: 'hie',
    sourceName: 'Kentucky HIE pilot feed',
    retrievedAt: '2026-07-01',
    effectiveDate: '2024-11-18',
    confidence: 'confirmed',
  },
  {
    id: 'fact_ruth_a1c_hie',
    patientId: HERO_ID,
    label: 'Recent A1C',
    value: '8.4 on 2026-05-12',
    sourceKind: 'hie',
    sourceName: 'Kentucky HIE pilot feed',
    retrievedAt: '2026-07-01',
    effectiveDate: '2026-05-12',
    confidence: 'confirmed',
  },
  {
    id: 'fact_ruth_gap_claims',
    patientId: HERO_ID,
    label: 'Retinal screening gap',
    value: 'No retinal screening claim found in the last 12 months',
    sourceKind: 'claims',
    sourceName: 'Claims gap file',
    retrievedAt: '2026-07-01',
    effectiveDate: '2026-06-30',
    confidence: 'probable',
  },
  {
    id: 'fact_ruth_site_feed',
    patientId: HERO_ID,
    label: 'Screening site availability',
    value: 'FQHC mobile camera has Saturday appointments and ride support',
    sourceKind: 'site_feed',
    sourceName: 'RHTP screening site feed',
    retrievedAt: '2026-07-01',
    effectiveDate: '2026-07-06',
    confidence: 'confirmed',
  },
]

const HERO_CONSENT: PatientConsent = {
  id: 'consent_ruth_patient_owned',
  patientId: HERO_ID,
  status: 'active',
  scope: 'Use diabetes screening gap, site, barrier, and outreach data for the retinopathy care plan',
  updatedAt: '2026-07-01',
}

const HERO_PROTOCOL_EVENTS: ProtocolEvent[] = [
  {
    id: 'proto_ruth_gap_imported',
    patientId: HERO_ID,
    type: 'care_gap_imported',
    label: 'Retinopathy gap imported from trusted sources',
    status: 'identified',
    createdAt: '2026-07-01T08:00:00',
    actor: 'system',
    sourceFactIds: ['fact_ruth_diabetes_hie', 'fact_ruth_gap_claims'],
  },
  {
    id: 'proto_ruth_patient_consented',
    patientId: HERO_ID,
    type: 'patient_consented',
    label: 'Patient consent active for Sandy outreach',
    status: 'patient_contactable',
    createdAt: '2026-07-01T08:05:00',
    actor: 'system',
    sourceFactIds: ['fact_ruth_diabetes_hie', 'fact_ruth_gap_claims', 'fact_ruth_site_feed'],
  },
]
```

Then add these arrays to the exported `seed` object:

```ts
sourceFacts: HERO_SOURCE_FACTS,
consents: [HERO_CONSENT],
protocolEvents: HERO_PROTOCOL_EVENTS,
voiceTurns: [],
redFlagEvents: [],
navigatorQueue: [],
```

- [ ] **Step 5: Run the focused test and commit**

Run: `npm test -- src/data/seed.test.ts`

Expected: PASS.

Then commit:

```bash
git add src/data/seed.ts src/data/seed.test.ts
git commit -m "feat: seed patient provenance rails"
```

---

### Task 4: Wire Store Actions To Voice, Protocol Events, And Navigator Queue

**Files:**
- Modify: `src/store/useStore.ts`
- Modify: `src/store/useStore.test.ts`

**Interfaces:**
- Consumes: `nextProtocolStatus`, `queueReasonForBarrier`, `priorityForQueueReason`, `screenPatientMessage`
- Produces store actions:
  - `startAutonomousOutreach(patientId: string): void`
  - `recordPatientVoiceReply(patientId: string, text: string): void`
  - `completeNavigatorQueueItem(itemId: string): void`

- [ ] **Step 1: Write failing store tests**

Add these tests to `src/store/useStore.test.ts`:

```ts
describe('production-shaped outreach actions', () => {
  it('starts Sandy outreach with a voice turn and protocol event', () => {
    s().startAutonomousOutreach(HERO_ID)

    expect(s().voiceTurns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          patientId: HERO_ID,
          speaker: 'sandy',
          safety: 'normal',
        }),
      ]),
    )
    expect(s().protocolEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          patientId: HERO_ID,
          type: 'sandy_explained_gap',
          status: 'explained',
        }),
      ]),
    )
  })

  it('turns a voice transportation barrier into protocol state and navigator queue work', () => {
    s().startAutonomousOutreach(HERO_ID)
    s().recordPatientVoiceReply(HERO_ID, 'I need a ride')

    expect(s().barriers).toEqual([
      expect.objectContaining({ patientId: HERO_ID, type: 'transportation' }),
    ])
    expect(s().navigatorQueue).toEqual([
      expect.objectContaining({
        patientId: HERO_ID,
        reason: 'transportation_barrier',
        priority: 'routine',
        status: 'open',
      }),
    ])
    expect(s().protocolEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'barrier_reported', status: 'barrier_collected' }),
      ]),
    )
  })

  it('escalates red flag voice replies without continuing normal coaching', () => {
    s().startAutonomousOutreach(HERO_ID)
    s().recordPatientVoiceReply(HERO_ID, 'I suddenly lost vision in one eye')

    expect(s().redFlagEvents).toEqual([
      expect.objectContaining({ patientId: HERO_ID, status: 'open' }),
    ])
    expect(s().navigatorQueue).toEqual([
      expect.objectContaining({
        patientId: HERO_ID,
        reason: 'red_flag_symptom',
        priority: 'urgent',
      }),
    ])
    expect(s().voiceTurns.at(-1)).toEqual(
      expect.objectContaining({
        speaker: 'sandy',
        safety: 'red_flag',
      }),
    )
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/store/useStore.test.ts`

Expected: FAIL because the new store actions do not exist.

- [ ] **Step 3: Add imports and StoreState actions**

In `src/store/useStore.ts`, update imports:

```ts
import {
  nextProtocolStatus,
  priorityForQueueReason,
  queueReasonForBarrier,
} from '../lib/retinopathy-protocol'
import { screenPatientMessage } from '../lib/safety'
import type { BarrierType, NavigatorQueueReason, ProtocolEventType, ResultOutcome } from '../types'
```

Update `StoreState`:

```ts
interface StoreState extends SeedState {
  askQuestion: (patientId: string, input: string, surface: string) => void
  reportBarrier: (patientId: string, type: BarrierType, detail: string) => void
  reportAlreadyCompleted: (patientId: string) => void
  scheduleScreening: (patientId: string, siteId: string, when: string) => void
  enterResult: (patientId: string, outcome: ResultOutcome) => void
  startAutonomousOutreach: (patientId: string) => void
  recordPatientVoiceReply: (patientId: string, text: string) => void
  completeNavigatorQueueItem: (itemId: string) => void
  reset: () => void
}
```

- [ ] **Step 4: Add local store helpers**

Add these helpers below `nextId` in `src/store/useStore.ts`:

```ts
const now = (): string => '2026-07-03T09:00:00'

const latestProtocolStatus = (state: SeedState, patientId: string) =>
  [...state.protocolEvents].reverse().find((event) => event.patientId === patientId)?.status ??
  'identified'

const heroSourceFactIds = (state: SeedState, patientId: string) =>
  state.sourceFacts.filter((fact) => fact.patientId === patientId).map((fact) => fact.id)

const protocolEvent = (
  state: SeedState,
  patientId: string,
  type: ProtocolEventType,
  label: string,
  actor: 'sandy' | 'patient' | 'navigator' | 'system',
  outcome?: ResultOutcome,
) => ({
  id: nextId('proto'),
  patientId,
  type,
  label,
  status: nextProtocolStatus(latestProtocolStatus(state, patientId), type, outcome),
  createdAt: now(),
  actor,
  sourceFactIds: heroSourceFactIds(state, patientId),
})

const queueItem = (
  patientId: string,
  reason: NavigatorQueueReason,
  summary: string,
  suggestedAction: string,
  sourceEventIds: string[],
) => ({
  id: nextId('queue'),
  patientId,
  reason,
  priority: priorityForQueueReason(reason),
  summary,
  suggestedAction,
  status: 'open' as const,
  createdAt: now(),
  sourceEventIds,
})

const barrierFromReply = (text: string): BarrierType | null => {
  if (/ride|transport/i.test(text)) return 'transportation'
  if (/cost|pay|insurance/i.test(text)) return 'cost'
  if (/after work|saturday|evening|weekend/i.test(text)) return 'after_hours'
  if (/already|done|completed/i.test(text)) return 'already_completed'
  if (/not ready|scared|afraid/i.test(text)) return 'not_ready'
  return null
}
```

- [ ] **Step 5: Implement the new actions**

Inside the Zustand object in `src/store/useStore.ts`, add these actions before `reset`:

```ts
startAutonomousOutreach: (patientId) =>
  set((state) => {
    const event = protocolEvent(
      state,
      patientId,
      'sandy_explained_gap',
      'Sandy explained the retinal screening gap',
      'sandy',
    )

    return {
      protocolEvents: [...state.protocolEvents, event],
      voiceTurns: [
        ...state.voiceTurns,
        {
          id: nextId('voice'),
          patientId,
          speaker: 'sandy' as const,
          text:
            'I am Sandy. I can help with your diabetes eye screening plan, explain why it matters, find a screening site, and bring in a navigator when needed.',
          createdAt: now(),
          mode: 'voice' as const,
          safety: 'normal' as const,
        },
      ],
    }
  }),

recordPatientVoiceReply: (patientId, text) =>
  set((state) => {
    const screened = screenPatientMessage(text)
    const patientTurn = {
      id: nextId('voice'),
      patientId,
      speaker: 'patient' as const,
      text,
      createdAt: now(),
      mode: 'voice' as const,
      safety: screened.category === 'red_flag' ? ('red_flag' as const) : ('normal' as const),
    }

    if (screened.category === 'red_flag') {
      const event = protocolEvent(
        state,
        patientId,
        'red_flag_reported',
        'Possible vision red flag reported',
        'patient',
      )

      return {
        protocolEvents: [...state.protocolEvents, event],
        voiceTurns: [
          ...state.voiceTurns,
          patientTurn,
          {
            id: nextId('voice'),
            patientId,
            speaker: 'sandy' as const,
            text: screened.patientCopy,
            createdAt: now(),
            mode: 'voice' as const,
            safety: 'red_flag' as const,
          },
        ],
        redFlagEvents: [
          ...state.redFlagEvents,
          {
            id: nextId('red'),
            patientId,
            symptom: text,
            action: 'Navigator urgent review',
            createdAt: now(),
            status: 'open' as const,
          },
        ],
        navigatorQueue: [
          ...state.navigatorQueue,
          queueItem(
            patientId,
            'red_flag_symptom',
            screened.navigatorSummary,
            'Call the patient and route to urgent clinical guidance.',
            [event.id],
          ),
        ],
      }
    }

    const barrier = barrierFromReply(text)
    if (barrier) {
      const event = protocolEvent(state, patientId, 'barrier_reported', 'Barrier reported by voice', 'patient')
      const reason = queueReasonForBarrier(barrier)

      return {
        protocolEvents: [...state.protocolEvents, event],
        voiceTurns: [...state.voiceTurns, patientTurn],
        barriers: [
          ...state.barriers,
          { id: nextId('bar'), patientId, type: barrier, detail: text, reportedVia: 'voice' },
        ],
        navigatorQueue: [
          ...state.navigatorQueue,
          queueItem(
            patientId,
            reason,
            `Patient said: ${text}`,
            'Help resolve the barrier and confirm the screening plan.',
            [event.id],
          ),
        ],
      }
    }

    const event = protocolEvent(state, patientId, 'question_answered', 'Question answered by Sandy', 'sandy')
    return {
      protocolEvents: [...state.protocolEvents, event],
      voiceTurns: [
        ...state.voiceTurns,
        patientTurn,
        {
          id: nextId('voice'),
          patientId,
          speaker: 'sandy' as const,
          text: screened.patientCopy,
          createdAt: now(),
          mode: 'voice' as const,
          safety: screened.category === 'off_protocol' ? ('fallback' as const) : ('normal' as const),
        },
      ],
    }
  }),

completeNavigatorQueueItem: (itemId) =>
  set((state) => ({
    navigatorQueue: state.navigatorQueue.map((item) =>
      item.id === itemId ? { ...item, status: 'done' as const } : item,
    ),
  })),
```

- [ ] **Step 6: Wire existing actions to protocol and navigator queue**

Update existing actions in `src/store/useStore.ts`:

- In `askQuestion`, append a `question_answered` protocol event.
- In `reportBarrier`, append a `barrier_reported` protocol event and a `NavigatorQueueItem` using `queueReasonForBarrier(type)`.
- In `reportAlreadyCompleted`, append an `already_completed_claimed` protocol event and queue reconciliation instead of treating the claim as fully closed.
- In `scheduleScreening`, append `site_matched` and `appointment_confirmed` protocol events.
- In `enterResult`, append `result_imported`; add queue items for abnormal and ungradable outcomes.

Use this exact result queue logic inside `enterResult` after `const seq = state.timeline.length`:

```ts
const resultEvent = protocolEvent(state, patientId, 'result_imported', 'Screening result imported', 'system', outcome)
const resultQueue =
  outcome === 'abnormal'
    ? [
        queueItem(
          patientId,
          'abnormal_result_referral',
          'Abnormal retinal screening result needs referral follow-up.',
          'Schedule or confirm retina specialist referral.',
          [resultEvent.id],
        ),
      ]
    : outcome === 'ungradable'
      ? [
          queueItem(
            patientId,
            'ungradable_repeat_needed',
            'Image was ungradable and needs repeat screening.',
            'Help the patient schedule repeat imaging.',
            [resultEvent.id],
          ),
        ]
      : []
```

Then include:

```ts
protocolEvents: [...state.protocolEvents, resultEvent],
navigatorQueue: [...state.navigatorQueue, ...resultQueue],
```

- [ ] **Step 7: Run the focused test and commit**

Run: `npm test -- src/store/useStore.test.ts`

Expected: PASS.

Then commit:

```bash
git add src/store/useStore.ts src/store/useStore.test.ts
git commit -m "feat: connect outreach state to navigator queue"
```

---

### Task 5: Add Patient-Facing Provenance And Safety Components

**Files:**
- Create: `src/components/phone/ProvenanceStrip.tsx`
- Create: `src/components/phone/ProvenanceStrip.test.tsx`
- Create: `src/components/phone/SafetyBoundaryCard.tsx`
- Create: `src/components/phone/SafetyBoundaryCard.test.tsx`
- Modify: `src/components/phone/TodayScreen.tsx`
- Modify: `src/components/phone/WhyItMattersScreen.tsx`

**Interfaces:**
- Consumes: `useStore().sourceFacts`
- Produces: `<ProvenanceStrip patientId={string} labels?: string[] />`
- Produces: `<SafetyBoundaryCard />`

- [ ] **Step 1: Write failing component tests**

Create `src/components/phone/ProvenanceStrip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../../data/seed'
import { useStore } from '../../store/useStore'
import { ProvenanceStrip } from './ProvenanceStrip'

beforeEach(() => useStore.getState().reset())

describe('ProvenanceStrip', () => {
  it('shows source, date, and confidence for patient-facing claims', () => {
    render(<ProvenanceStrip patientId={HERO_ID} labels={['Diabetes diagnosis', 'Retinal screening gap']} />)

    expect(screen.getByText(/Kentucky HIE pilot feed/i)).toBeInTheDocument()
    expect(screen.getByText(/Claims gap file/i)).toBeInTheDocument()
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument()
    expect(screen.getByText(/probable/i)).toBeInTheDocument()
  })
})
```

Create `src/components/phone/SafetyBoundaryCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SafetyBoundaryCard } from './SafetyBoundaryCard'

describe('SafetyBoundaryCard', () => {
  it('states what Sandy can do and when a human is needed', () => {
    render(<SafetyBoundaryCard />)

    expect(screen.getByText(/Sandy can help with screening steps/i)).toBeInTheDocument()
    expect(screen.getByText(/cannot diagnose/i)).toBeInTheDocument()
    expect(screen.getByText(/sudden vision changes/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- src/components/phone/ProvenanceStrip.test.tsx src/components/phone/SafetyBoundaryCard.test.tsx`

Expected: FAIL because both components do not exist.

- [ ] **Step 3: Add ProvenanceStrip**

Create `src/components/phone/ProvenanceStrip.tsx`:

```tsx
import { Database, ShieldCheck } from 'lucide-react'
import { useStore } from '../../store/useStore'

interface ProvenanceStripProps {
  patientId: string
  labels?: string[]
}

export function ProvenanceStrip({ patientId, labels }: ProvenanceStripProps) {
  const facts = useStore((state) =>
    state.sourceFacts.filter(
      (fact) => fact.patientId === patientId && (!labels || labels.includes(fact.label)),
    ),
  )

  if (facts.length === 0) return null

  return (
    <section className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-slate-700">
      <div className="mb-2 flex items-center gap-2 font-semibold text-teal-900">
        <ShieldCheck className="size-4" />
        Why Sandy can say this
      </div>
      <div className="space-y-2">
        {facts.map((fact) => (
          <div key={fact.id} className="flex gap-2">
            <Database className="mt-0.5 size-3.5 shrink-0 text-teal-700" />
            <p>
              <span className="font-semibold">{fact.label}:</span> {fact.value}. Source:{' '}
              {fact.sourceName}. Effective {fact.effectiveDate}. {fact.confidence}.
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Add SafetyBoundaryCard**

Create `src/components/phone/SafetyBoundaryCard.tsx`:

```tsx
import { AlertTriangle, Mic } from 'lucide-react'

export function SafetyBoundaryCard() {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-slate-700">
      <div className="mb-2 flex items-center gap-2 font-semibold text-amber-900">
        <Mic className="size-4" />
        What Sandy can safely do
      </div>
      <p>
        Sandy can help with screening steps, reminders, barriers, site choices, and navigator
        handoffs. Sandy cannot diagnose, change medicines, or reassure urgent symptoms.
      </p>
      <div className="mt-2 flex gap-2 text-amber-900">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <p>Sudden vision changes, new flashes or floaters, or eye pain go to a human reviewer.</p>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Add the components to existing patient screens**

In `src/components/phone/TodayScreen.tsx`, import:

```ts
import { HERO_ID } from '../../data/seed'
import { ProvenanceStrip } from './ProvenanceStrip'
import { SafetyBoundaryCard } from './SafetyBoundaryCard'
```

Render below the main next-action card:

```tsx
<ProvenanceStrip patientId={HERO_ID} labels={['Diabetes diagnosis', 'Retinal screening gap']} />
<SafetyBoundaryCard />
```

In `src/components/phone/WhyItMattersScreen.tsx`, import:

```ts
import { HERO_ID } from '../../data/seed'
import { ProvenanceStrip } from './ProvenanceStrip'
```

Render near the retinopathy explanation:

```tsx
<ProvenanceStrip patientId={HERO_ID} labels={['Diabetes diagnosis', 'Recent A1C', 'Retinal screening gap']} />
```

- [ ] **Step 6: Run focused tests and commit**

Run: `npm test -- src/components/phone/ProvenanceStrip.test.tsx src/components/phone/SafetyBoundaryCard.test.tsx src/components/TodayScreen.test.tsx`

Expected: PASS.

Then commit:

```bash
git add src/components/phone/ProvenanceStrip.tsx src/components/phone/ProvenanceStrip.test.tsx src/components/phone/SafetyBoundaryCard.tsx src/components/phone/SafetyBoundaryCard.test.tsx src/components/phone/TodayScreen.tsx src/components/phone/WhyItMattersScreen.tsx
git commit -m "feat: show patient provenance and Sandy limits"
```

---

### Task 6: Add Voice-First Sandy Screen

**Files:**
- Create: `src/components/phone/VoiceCompanionScreen.tsx`
- Create: `src/components/phone/VoiceCompanionScreen.test.tsx`
- Modify: `src/components/phone/PhoneApp.tsx`

**Interfaces:**
- Consumes: `startAutonomousOutreach(patientId)`, `recordPatientVoiceReply(patientId, text)`
- Produces: default phone route `voice`

- [ ] **Step 1: Write failing voice screen tests**

Create `src/components/phone/VoiceCompanionScreen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../../store/useStore'
import { VoiceCompanionScreen } from './VoiceCompanionScreen'

beforeEach(() => useStore.getState().reset())

describe('VoiceCompanionScreen', () => {
  it('starts Sandy voice outreach and shows the transcript', async () => {
    render(<VoiceCompanionScreen />)

    await userEvent.click(screen.getByRole('button', { name: /start voice outreach/i }))

    expect(screen.getByText(/I am Sandy/i)).toBeInTheDocument()
    expect(useStore.getState().protocolEvents.some((event) => event.type === 'sandy_explained_gap')).toBe(true)
  })

  it('lets the patient report a ride barrier by voice chip', async () => {
    render(<VoiceCompanionScreen />)

    await userEvent.click(screen.getByRole('button', { name: /start voice outreach/i }))
    await userEvent.click(screen.getByRole('button', { name: /I need a ride/i }))

    expect(screen.getByText(/I need a ride/i)).toBeInTheDocument()
    expect(useStore.getState().navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({ reason: 'transportation_barrier' }),
    )
  })

  it('shows red-flag escalation copy when the patient reports sudden vision changes', async () => {
    render(<VoiceCompanionScreen />)

    await userEvent.click(screen.getByRole('button', { name: /start voice outreach/i }))
    await userEvent.click(screen.getByRole('button', { name: /sudden vision changes/i }))

    expect(screen.getByText(/could be urgent/i)).toBeInTheDocument()
    expect(useStore.getState().navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({ reason: 'red_flag_symptom', priority: 'urgent' }),
    )
  })
})
```

- [ ] **Step 2: Run focused test and verify it fails**

Run: `npm test -- src/components/phone/VoiceCompanionScreen.test.tsx`

Expected: FAIL because the screen does not exist.

- [ ] **Step 3: Add VoiceCompanionScreen**

Create `src/components/phone/VoiceCompanionScreen.tsx`:

```tsx
import { Mic, Radio, UserRound } from 'lucide-react'
import { HERO_ID } from '../../data/seed'
import { useStore } from '../../store/useStore'
import { ProvenanceStrip } from './ProvenanceStrip'
import { SafetyBoundaryCard } from './SafetyBoundaryCard'

const CHIPS = [
  'Why do I need this?',
  'I need a ride',
  'I need a Saturday appointment',
  'I have sudden vision changes',
]

export function VoiceCompanionScreen() {
  const turns = useStore((state) => state.voiceTurns.filter((turn) => turn.patientId === HERO_ID))
  const startAutonomousOutreach = useStore((state) => state.startAutonomousOutreach)
  const recordPatientVoiceReply = useStore((state) => state.recordPatientVoiceReply)

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-teal-700 p-4 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Radio className="size-4" />
          Sandy voice companion
        </div>
        <h2 className="mt-2 text-2xl font-bold">Start with voice</h2>
        <p className="mt-2 text-sm text-teal-50">
          Sandy can explain the eye screening gap, help choose a site, collect barriers, and call
          in a navigator when the protocol says a human should help.
        </p>
        <button
          onClick={() => startAutonomousOutreach(HERO_ID)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-teal-800"
        >
          <Mic className="size-4" />
          Start voice outreach
        </button>
      </section>

      <div className="space-y-2">
        {turns.map((turn) => (
          <div
            key={turn.id}
            className={`rounded-lg p-3 text-sm ${
              turn.speaker === 'sandy' ? 'bg-stone-100 text-slate-800' : 'bg-teal-50 text-teal-950'
            }`}
          >
            <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
              {turn.speaker === 'sandy' ? <Mic className="size-3" /> : <UserRound className="size-3" />}
              {turn.speaker}
            </div>
            {turn.text}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => recordPatientVoiceReply(HERO_ID, chip)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700"
          >
            {chip}
          </button>
        ))}
      </div>

      <ProvenanceStrip patientId={HERO_ID} labels={['Diabetes diagnosis', 'Retinal screening gap']} />
      <SafetyBoundaryCard />
    </div>
  )
}
```

- [ ] **Step 4: Make voice the default phone screen**

Modify `src/components/phone/PhoneApp.tsx`:

```tsx
import { VoiceCompanionScreen } from './VoiceCompanionScreen'

export type PhoneScreen = 'voice' | 'today' | 'why' | 'find' | 'plan' | 'result'

const ORDER: PhoneScreen[] = ['voice', 'today', 'why', 'find', 'plan', 'result']
const LABEL: Record<PhoneScreen, string> = {
  voice: 'Voice',
  today: 'Today',
  why: 'Why',
  find: 'Find',
  plan: 'Plan',
  result: 'Result',
}
```

Set the initial state to voice and render the new screen:

```tsx
const [screen, setScreen] = useState<PhoneScreen>('voice')

{screen === 'voice' && <VoiceCompanionScreen />}
```

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- src/components/phone/VoiceCompanionScreen.test.tsx src/components/SideBySide.test.tsx`

Expected: PASS after updating any old default-screen assertion that assumed `Today` was first.

Then commit:

```bash
git add src/components/phone/VoiceCompanionScreen.tsx src/components/phone/VoiceCompanionScreen.test.tsx src/components/phone/PhoneApp.tsx src/components/SideBySide.test.tsx
git commit -m "feat: make Sandy voice first"
```

---

### Task 7: Make Navigator Queue The Primary Hub View

**Files:**
- Create: `src/components/hub/NavigatorQueueView.tsx`
- Create: `src/components/hub/NavigatorQueueView.test.tsx`
- Modify: `src/components/hub/HubShell.tsx`

**Interfaces:**
- Consumes: `useStore().navigatorQueue`, `patients`, `protocolEvents`, `sourceFacts`
- Produces: default hub view `queue`

- [ ] **Step 1: Write failing navigator queue tests**

Create `src/components/hub/NavigatorQueueView.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../../data/seed'
import { useStore } from '../../store/useStore'
import { NavigatorQueueView } from './NavigatorQueueView'

beforeEach(() => useStore.getState().reset())

describe('NavigatorQueueView', () => {
  it('renders actionable queue items with source context and suggested action', () => {
    useStore.getState().startAutonomousOutreach(HERO_ID)
    useStore.getState().recordPatientVoiceReply(HERO_ID, 'I need a ride')

    render(<NavigatorQueueView />)

    expect(screen.getByText(/Ruth Ann Caldwell/i)).toBeInTheDocument()
    expect(screen.getByText(/transportation barrier/i)).toBeInTheDocument()
    expect(screen.getByText(/Help resolve the barrier/i)).toBeInTheDocument()
    expect(screen.getByText(/source facts/i)).toBeInTheDocument()
  })

  it('shows an empty queue state when no human work is needed', () => {
    render(<NavigatorQueueView />)

    expect(screen.getByText(/No open navigator work/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/components/hub/NavigatorQueueView.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Add NavigatorQueueView**

Create `src/components/hub/NavigatorQueueView.tsx`:

```tsx
import { AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { NavigatorQueuePriority } from '../../types'

const priorityClass: Record<NavigatorQueuePriority, string> = {
  routine: 'bg-slate-100 text-slate-700',
  soon: 'bg-amber-100 text-amber-900',
  urgent: 'bg-red-100 text-red-900',
}

const labelForReason = (reason: string) => reason.replaceAll('_', ' ')

export function NavigatorQueueView() {
  const queue = useStore((state) => state.navigatorQueue.filter((item) => item.status === 'open'))
  const patients = useStore((state) => state.patients)
  const sourceFacts = useStore((state) => state.sourceFacts)
  const completeNavigatorQueueItem = useStore((state) => state.completeNavigatorQueueItem)

  if (queue.length === 0) {
    return (
      <section className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-center">
        <ClipboardList className="mx-auto size-8 text-teal-700" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">No open navigator work</h2>
        <p className="mt-1 text-sm text-slate-600">
          Sandy can keep handling protocol-safe outreach until a barrier, uncertainty, result, or
          red flag needs a human.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Navigator queue</h2>
        <p className="text-sm text-slate-600">Structured work returned from Sandy outreach.</p>
      </div>

      {queue.map((item) => {
        const patient = patients.find((candidate) => candidate.id === item.patientId)
        const facts = sourceFacts.filter((fact) => fact.patientId === item.patientId)

        return (
          <article key={item.id} className="rounded-lg border border-stone-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">{patient?.name ?? 'Unknown patient'}</h3>
                <p className="text-sm text-slate-600">{patient?.county} County</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${priorityClass[item.priority]}`}>
                {item.priority}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              {item.priority === 'urgent' ? <AlertTriangle className="size-4" /> : <ClipboardList className="size-4" />}
              {labelForReason(item.reason)}
            </div>
            <p className="mt-2 text-sm text-slate-700">{item.summary}</p>
            <p className="mt-2 rounded-lg bg-teal-50 p-3 text-sm font-semibold text-teal-900">
              {item.suggestedAction}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {facts.length} source facts, {item.sourceEventIds.length} protocol events
            </p>
            <button
              onClick={() => completeNavigatorQueueItem(item.id)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            >
              <CheckCircle2 className="size-4" />
              Mark done
            </button>
          </article>
        )
      })}
    </section>
  )
}
```

- [ ] **Step 4: Make the queue the default hub view**

Modify `src/components/hub/HubShell.tsx`:

```tsx
import { Activity, BarChart3, ClipboardList, Inbox, ListChecks, Map } from 'lucide-react'
import { NavigatorQueueView } from './NavigatorQueueView'

export type HubView = 'queue' | 'gaps' | 'timeline' | 'referrals' | 'outcomes' | 'expansion'

const NAV: { view: HubView; label: string; Icon: LucideIcon }[] = [
  { view: 'queue', label: 'Navigator queue', Icon: ClipboardList },
  { view: 'gaps', label: 'Gap list', Icon: ListChecks },
  { view: 'timeline', label: 'Patient timeline', Icon: Activity },
  { view: 'referrals', label: 'Referral queue', Icon: Inbox },
  { view: 'outcomes', label: 'Program outcomes', Icon: BarChart3 },
  { view: 'expansion', label: 'Expansion map', Icon: Map },
]
```

Set the default state and render:

```tsx
const [view, setView] = useState<HubView>('queue')

{view === 'queue' && <NavigatorQueueView />}
```

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- src/components/hub/NavigatorQueueView.test.tsx src/components/GapListView.test.tsx`

Expected: PASS.

Then commit:

```bash
git add src/components/hub/NavigatorQueueView.tsx src/components/hub/NavigatorQueueView.test.tsx src/components/hub/HubShell.tsx
git commit -m "feat: make navigator queue primary"
```

---

### Task 8: Update Cross-Surface Golden Path

**Files:**
- Modify: `src/components/SideBySide.test.tsx`
- Modify: `src/golden-path.test.tsx`

**Interfaces:**
- Consumes: voice screen, navigator queue, store actions from earlier tasks.
- Produces: full P0 proof path across patient app and hub.

- [ ] **Step 1: Replace the SideBySide barrier test**

Update the first test in `src/components/SideBySide.test.tsx`:

```tsx
it('a voice-reported barrier appears in the navigator queue', async () => {
  render(<SideBySide />)

  await userEvent.click(screen.getByRole('button', { name: /start voice outreach/i }))
  await userEvent.click(screen.getByRole('button', { name: /I need a ride/i }))

  expect(screen.getByText(/transportation barrier/i)).toBeInTheDocument()
  expect(screen.getByText(/Help resolve the barrier/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Add red-flag integration coverage**

Add this test to `src/components/SideBySide.test.tsx`:

```tsx
it('a voice red flag appears as urgent navigator work', async () => {
  render(<SideBySide />)

  await userEvent.click(screen.getByRole('button', { name: /start voice outreach/i }))
  await userEvent.click(screen.getByRole('button', { name: /sudden vision changes/i }))

  expect(screen.getByText(/red flag symptom/i)).toBeInTheDocument()
  expect(screen.getByText(/urgent/i)).toBeInTheDocument()
})
```

- [ ] **Step 3: Update the golden path**

Replace the core journey in `src/golden-path.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './store/useStore'
import { SideBySide } from './components/SideBySide'

beforeEach(() => useStore.getState().reset())

describe('RHTP P0 production-shaped golden path', () => {
  it('moves from voice outreach to navigator queue to scheduled plan and outcome metrics', async () => {
    render(<SideBySide />)

    await userEvent.click(screen.getByRole('button', { name: /start voice outreach/i }))
    await userEvent.click(screen.getByRole('button', { name: /I need a ride/i }))

    expect(screen.getByText(/transportation barrier/i)).toBeInTheDocument()
    expect(useStore.getState().navigatorQueue.at(-1)?.reason).toBe('transportation_barrier')

    await userEvent.click(screen.getByRole('button', { name: 'Find' }))
    await userEvent.click(screen.getByRole('button', { name: /FQHC mobile camera/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))

    expect(useStore.getState().gaps.find((gap) => gap.patientId === 'pat_ruthann')?.status).toBe('scheduled')
    expect(useStore.getState().metrics.find((metric) => metric.id === 'scheduled')?.value).toBe(6)
  })
})
```

- [ ] **Step 4: Run cross-surface tests and commit**

Run: `npm test -- src/components/SideBySide.test.tsx src/golden-path.test.tsx`

Expected: PASS.

Then commit:

```bash
git add src/components/SideBySide.test.tsx src/golden-path.test.tsx
git commit -m "test: cover P0 voice-to-queue journey"
```

---

### Task 9: Final Verification, Browser Smoke, And Sprint Update

**Files:**
- Modify: `docs/superpowers/sprints/2026-07-03-rhtp-production-architecture-sprint.md`

**Interfaces:**
- Produces final proof that P0 is locally implemented, tested, and built.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript passes and Vite emits `dist/`.

- [ ] **Step 3: Start or reuse the dev server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: app is available at `http://127.0.0.1:5173/`.

- [ ] **Step 4: Browser smoke the user-facing path**

In the browser at `http://127.0.0.1:5173/`:

1. Confirm the phone opens on `Sandy voice companion`.
2. Click `Start voice outreach`.
3. Click `I need a ride`.
4. Confirm the hub default view is `Navigator queue`.
5. Confirm the queue shows Ruth Ann Caldwell, `transportation barrier`, source fact count, and the suggested navigator action.
6. Click `Voice`, then `I have sudden vision changes`.
7. Confirm the queue shows `red flag symptom` with `urgent`.

- [ ] **Step 5: Update the sprint tracker**

Edit `docs/superpowers/sprints/2026-07-03-rhtp-production-architecture-sprint.md`:

```md
**Plan:** docs/superpowers/plans/2026-07-03-rhtp-production-shaped-prototype-plan.md

## Current Phase
Phase 4 - Handoff

## Phase 3 - Documentation
**Status:** done
**Spec path:** docs/superpowers/specs/2026-07-03-rhtp-production-architecture.md
**Spec approved:** yes

## Phase 4 - Handoff
**Status:** done
**Plan path:** docs/superpowers/plans/2026-07-03-rhtp-production-shaped-prototype-plan.md

## Next Action
Execute the P0 implementation plan with subagent-driven development or inline execution.
```

- [ ] **Step 6: Commit the sprint tracker after implementation proof**

```bash
git add docs/superpowers/sprints/2026-07-03-rhtp-production-architecture-sprint.md
git commit -m "docs: mark P0 handoff ready"
```

---

## Acceptance Checklist

- [ ] Phone default is Sandy voice companion.
- [ ] Patient can start simulated voice outreach.
- [ ] Voice transcript is visible and durable in store state.
- [ ] Patient-facing claims show source provenance.
- [ ] Safety boundary copy is visible.
- [ ] Red-flag phrases interrupt normal flow and create urgent navigator work.
- [ ] Barriers create protocol events and navigator queue items.
- [ ] Navigator queue is the default hub view.
- [ ] Abnormal and ungradable results create navigator queue items.
- [ ] Existing metrics still update for scheduled and completed outcomes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] Browser smoke confirms the voice-to-queue loop.

## Self-Review

- Spec coverage: P0 requirements from the architecture spec map to Tasks 1 through 9: voice-first UI simulation, navigator queue default, provenance labels, autonomous protocol events, safety boundary copy, and red-flag escalation.
- Backend boundary: The plan does not add real HIE, claims, EMR, database, or OpenAI Realtime integration; those remain outside P0.
- Type consistency: Type names used by the store, components, and tests match Task 1 exports.
- Placeholder scan: The plan contains concrete files, commands, expected results, interfaces, and code snippets for every code-changing step.
