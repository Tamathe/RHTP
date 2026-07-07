import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../data/seed'
import { useStore } from './useStore'

const s = () => useStore.getState()
const heroGap = () => s().gaps.find((gap) => gap.patientId === HERO_ID)!

beforeEach(() => s().reset())

describe('store reset', () => {
  it('restores the hero gap to overdue and clears created records', () => {
    s().reportBarrier(HERO_ID, 'transportation', 'no ride')
    expect(s().navigatorTasks.length).toBe(1)
    s().reset()
    expect(heroGap().status).toBe('overdue')
    expect(s().navigatorTasks.length).toBe(0)
    expect(s().barriers.length).toBe(0)
  })

  it('restores counters to baseline', () => {
    s().scheduleScreening(HERO_ID, 'site_fqhc_mobile', 'Saturday 9:00 AM')
    s().reset()
    expect(s().metrics.find((metric) => metric.id === 'scheduled')!.value).toBe(5)
  })
})

describe('askQuestion', () => {
  it('engages the gap, sets app_engaged, records outreach and timeline', () => {
    s().askQuestion(HERO_ID, 'Why me?', 'today')
    expect(heroGap().status).toBe('engaged')
    expect(heroGap().priorityLabel).toBe('app_engaged')
    expect(s().outreach.some((event) => event.detail === 'Why me?')).toBe(true)
    expect(s().timeline.some((entry) => entry.label === 'Questions asked')).toBe(true)
  })
})

describe('askEducationQuestion', () => {
  it('records a normal education question as outreach without escalating', () => {
    s().askEducationQuestion(HERO_ID, 'What is diabetic retinopathy?')
    expect(s().outreach.some((event) => event.surface === 'learn')).toBe(true)
    expect(s().redFlagEvents).toHaveLength(0)
    expect(s().navigatorQueue).toHaveLength(0)
  })

  it('escalates a typed red-flag symptom to the navigator queue', () => {
    s().askEducationQuestion(HERO_ID, 'I have new flashes and a bunch of floaters')
    expect(s().redFlagEvents).toHaveLength(1)
    expect(s().navigatorQueue.at(-1)?.reason).toBe('red_flag_symptom')
  })

  it('escalates a plain-language acute symptom the crisis regex misses', () => {
    // "losing my sight" is not in the deterministic crisis corpus; the
    // education acute-vision guard must still route it to a human.
    s().askEducationQuestion(HERO_ID, 'I am losing my sight')
    expect(s().redFlagEvents).toHaveLength(1)
    expect(s().navigatorQueue.at(-1)?.reason).toBe('red_flag_symptom')
  })
})

describe('reportBarrier', () => {
  it('creates a barrier plus navigator task and flags navigator_needed', () => {
    s().reportBarrier(HERO_ID, 'transportation', 'No weekday ride')
    expect(s().barriers).toHaveLength(1)
    expect(s().navigatorTasks).toHaveLength(1)
    expect(heroGap().priorityLabel).toBe('navigator_needed')
    expect(heroGap().status).toBe('engaged')
    expect(s().timeline.filter((entry) => entry.label.includes('Navigator task created'))).toHaveLength(1)
  })
})

describe('requestSdohResourceHelp', () => {
  it('creates navigator work for a Kentucky resource connection request', () => {
    s().requestSdohResourceHelp(HERO_ID, 'lklp_transportation_region_13', 'transportation')

    expect(s().navigatorQueue).toEqual([
      expect.objectContaining({
        patientId: HERO_ID,
        reason: 'sdoh_resource_connection',
        priority: 'routine',
        status: 'open',
        summary: expect.stringContaining('LKLP Community Action Council transportation'),
        suggestedAction: expect.stringMatching(/confirm availability/i),
      }),
    ])
    expect(s().protocolEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          patientId: HERO_ID,
          type: 'sdoh_resource_requested',
          status: 'navigator_review',
        }),
      ]),
    )
  })
})

describe('scheduleScreening', () => {
  it('sets scheduled, adds a care-plan task, ticks the scheduled counter', () => {
    s().reportBarrier(HERO_ID, 'transportation', 'No ride')
    s().scheduleScreening(HERO_ID, 'site_fqhc_mobile', 'Saturday 9:00 AM')
    expect(heroGap().status).toBe('scheduled')
    expect(s().carePlanTasks).toHaveLength(1)
    expect(s().metrics.find((metric) => metric.id === 'scheduled')!.value).toBe(6)
  })
})

describe('reportAlreadyCompleted', () => {
  it('queues reconciliation instead of closing the gap immediately', () => {
    s().reportAlreadyCompleted(HERO_ID)
    expect(heroGap().status).toBe('overdue')
    expect(s().metrics.find((metric) => metric.id === 'gaps_closed')!.value).toBe(4)
    expect(s().navigatorQueue).toEqual([
      expect.objectContaining({
        patientId: HERO_ID,
        reason: 'already_completed_needs_reconciliation',
        priority: 'routine',
        status: 'open',
      }),
    ])
    expect(s().protocolEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          patientId: HERO_ID,
          type: 'already_completed_claimed',
          status: 'navigator_review',
        }),
      ]),
    )
  })
})

describe('enterResult', () => {
  it('normal result closes the gap and ticks completed plus gaps_closed', () => {
    s().scheduleScreening(HERO_ID, 'site_fqhc_mobile', 'Saturday 9:00 AM')
    s().enterResult(HERO_ID, 'normal')
    expect(heroGap().status).toBe('closed')
    expect(s().metrics.find((metric) => metric.id === 'completed')!.value).toBe(7)
    expect(s().metrics.find((metric) => metric.id === 'gaps_closed')!.value).toBe(5)
  })

  it('abnormal result routes to referral and adds a queue row', () => {
    s().scheduleScreening(HERO_ID, 'site_fqhc_mobile', 'Saturday 9:00 AM')
    const before = s().referrals.length
    s().enterResult(HERO_ID, 'abnormal')
    expect(heroGap().status).toBe('referral')
    expect(s().referrals.length).toBe(before + 1)
  })

  it('ungradable result routes to repeat', () => {
    s().scheduleScreening(HERO_ID, 'site_fqhc_mobile', 'Saturday 9:00 AM')
    s().enterResult(HERO_ID, 'ungradable')
    expect(heroGap().status).toBe('repeat')
  })
})

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

  it('keeps Sandy locked on urgent guidance after an open red flag', () => {
    s().startAutonomousOutreach(HERO_ID)
    s().recordPatientVoiceReply(HERO_ID, 'I suddenly lost vision in one eye')
    const questionEventsBefore = s().protocolEvents.filter(
      (event) => event.type === 'question_answered',
    ).length
    const queueCountBefore = s().navigatorQueue.length

    s().recordPatientVoiceReply(HERO_ID, 'Why do I need this?')

    expect(s().protocolEvents.filter((event) => event.type === 'question_answered')).toHaveLength(
      questionEventsBefore,
    )
    expect(s().navigatorQueue).toHaveLength(queueCountBefore)
    expect(s().voiceTurns.at(-1)).toEqual(
      expect.objectContaining({
        speaker: 'sandy',
        safety: 'red_flag',
        text: expect.stringMatching(/navigator already needs to review/i),
      }),
    )
  })
})
