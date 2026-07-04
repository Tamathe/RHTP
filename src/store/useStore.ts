import { create } from 'zustand'
import { seed, type SeedState } from '../data/seed'
import { incrementMetric } from '../lib/metrics'
import {
  getKentuckyResourceById,
  sdohNeedLabel,
  type SdohNeedType,
} from '../lib/kentucky-sdoh-resources'
import {
  nextProtocolStatus,
  priorityForQueueReason,
  queueReasonForBarrier,
} from '../lib/retinopathy-protocol'
import { screenPatientMessage } from '../lib/safety'
import { outcomeToStatus, transition } from '../lib/screening-gap'
import type {
  BarrierType,
  NavigatorQueueReason,
  ProtocolEventType,
  ResultOutcome,
} from '../types'

interface StoreState extends SeedState {
  askQuestion: (patientId: string, input: string, surface: string) => void
  reportBarrier: (patientId: string, type: BarrierType, detail: string) => void
  reportAlreadyCompleted: (patientId: string) => void
  scheduleScreening: (patientId: string, siteId: string, when: string) => void
  enterResult: (patientId: string, outcome: ResultOutcome) => void
  startAutonomousOutreach: (patientId: string) => void
  recordPatientVoiceReply: (patientId: string, text: string) => void
  requestSdohResourceHelp: (patientId: string, resourceId: string, needType: SdohNeedType) => void
  completeNavigatorQueueItem: (itemId: string) => void
  reset: () => void
}

const clone = (): SeedState => structuredClone(seed)

let counter = 0

const nextId = (prefix: string): string => `${prefix}_${++counter}`

const now = (): string => '2026-07-03T09:00:00'

const RED_FLAG_LOCK_COPY =
  'A navigator already needs to review this urgent vision concern. Sandy cannot continue routine coaching until a human has helped.'

const latestProtocolStatus = (state: SeedState, patientId: string) =>
  [...state.protocolEvents].reverse().find((event) => event.patientId === patientId)?.status ??
  'identified'

const hasOpenRedFlag = (state: SeedState, patientId: string): boolean =>
  state.redFlagEvents.some((event) => event.patientId === patientId && event.status === 'open')

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

export const useStore = create<StoreState>((set) => ({
  ...clone(),

  askQuestion: (patientId, input, surface) =>
    set((state) => {
      const event = protocolEvent(
        state,
        patientId,
        'question_answered',
        'Question answered by Sandy',
        'sandy',
      )
      const gaps = state.gaps.map((gap) =>
        gap.patientId === patientId
          ? {
              ...(gap.status === 'overdue' ? transition(gap, 'engaged') : gap),
              priorityLabel: 'app_engaged' as const,
            }
          : gap,
      )
      const seq = state.timeline.length
      return {
        gaps,
        outreach: [
          ...state.outreach,
          {
            id: nextId('out'),
            patientId,
            kind: 'assistant_question' as const,
            detail: input,
            surface,
          },
        ],
        timeline: [
          ...state.timeline,
          { id: nextId('tl'), patientId, label: 'Questions asked', seq },
        ],
        protocolEvents: [...state.protocolEvents, event],
      }
    }),

  reportBarrier: (patientId, type, detail) =>
    set((state) => {
      const event = protocolEvent(
        state,
        patientId,
        'barrier_reported',
        'Barrier reported by patient',
        'patient',
      )
      const reason = queueReasonForBarrier(type)
      const gaps = state.gaps.map((gap) =>
        gap.patientId === patientId
          ? {
              ...(gap.status === 'overdue' ? transition(gap, 'engaged') : gap),
              priorityLabel: 'navigator_needed' as const,
            }
          : gap,
      )
      const seq = state.timeline.length
      return {
        gaps,
        barriers: [
          ...state.barriers,
          { id: nextId('bar'), patientId, type, detail, reportedVia: 'plan_builder' },
        ],
        navigatorTasks: [
          ...state.navigatorTasks,
          {
            id: nextId('task'),
            patientId,
            type: `resolve_${type}`,
            status: 'open' as const,
            owner: 'nav_dana',
            note: detail,
          },
        ],
        navigatorQueue: [
          ...state.navigatorQueue,
          queueItem(
            patientId,
            reason,
            `Patient reported ${type.replace(/_/g, ' ')} barrier: ${detail}`,
            'Help resolve the barrier and confirm the screening plan.',
            [event.id],
          ),
        ],
        timeline: [
          ...state.timeline,
          { id: nextId('tl'), patientId, label: 'Barrier reported', seq },
          { id: nextId('tl'), patientId, label: 'Navigator task created', seq: seq + 1 },
        ],
        protocolEvents: [...state.protocolEvents, event],
      }
    }),

  requestSdohResourceHelp: (patientId, resourceId, needType) =>
    set((state) => {
      const resource = getKentuckyResourceById(resourceId)
      if (!resource) return {}

      const patient = state.patients.find((candidate) => candidate.id === patientId)
      const county = patient?.county ?? 'Kentucky'
      const event = protocolEvent(
        state,
        patientId,
        'sdoh_resource_requested',
        'SDOH resource connection requested',
        'patient',
      )

      return {
        protocolEvents: [...state.protocolEvents, event],
        navigatorQueue: [
          ...state.navigatorQueue,
          queueItem(
            patientId,
            'sdoh_resource_connection',
            `Patient requested help connecting to ${resource.name} for ${sdohNeedLabel(
              needType,
            ).toLowerCase()} support in ${county} County. Source: ${resource.sourceName}.`,
            `Confirm availability and eligibility through kynect/211 or the listed source before sharing next steps. Contact path: ${resource.contact}.`,
            [event.id],
          ),
        ],
      }
    }),

  reportAlreadyCompleted: (patientId) =>
    set((state) => {
      const event = protocolEvent(
        state,
        patientId,
        'already_completed_claimed',
        'Patient reported screening already completed',
        'patient',
      )
      const seq = state.timeline.length
      return {
        navigatorQueue: [
          ...state.navigatorQueue,
          queueItem(
            patientId,
            'already_completed_needs_reconciliation',
            'Patient says screening already happened and needs reconciliation.',
            'Review provenance and reconcile the reported completion.',
            [event.id],
          ),
        ],
        timeline: [
          ...state.timeline,
          { id: nextId('tl'), patientId, label: 'Reported already completed', seq },
        ],
        protocolEvents: [...state.protocolEvents, event],
      }
    }),

  scheduleScreening: (patientId, siteId, when) =>
    set((state) => {
      const siteMatchedEvent = protocolEvent(
        state,
        patientId,
        'site_matched',
        'Screening site matched for the patient',
        'sandy',
      )
      const appointmentEvent = protocolEvent(
        { ...state, protocolEvents: [...state.protocolEvents, siteMatchedEvent] },
        patientId,
        'appointment_confirmed',
        'Screening appointment confirmed',
        'patient',
      )
      const gaps = state.gaps.map((gap) => {
        if (gap.patientId !== patientId) return gap
        const engaged = gap.status === 'overdue' ? transition(gap, 'engaged') : gap
        return transition(engaged, 'scheduled')
      })
      const seq = state.timeline.length
      return {
        gaps,
        carePlanTasks: [
          ...state.carePlanTasks,
          { id: nextId('plan'), patientId, siteId, step: 'attend_screening', when },
        ],
        metrics: incrementMetric(state.metrics, 'scheduled'),
        timeline: [
          ...state.timeline,
          { id: nextId('tl'), patientId, label: 'Site recommended', seq },
          { id: nextId('tl'), patientId, label: 'Screening scheduled', seq: seq + 1 },
        ],
        protocolEvents: [...state.protocolEvents, siteMatchedEvent, appointmentEvent],
      }
    }),

  enterResult: (patientId, outcome) =>
    set((state) => {
      const target = outcomeToStatus(outcome)
      const originalGap = state.gaps.find((gap) => gap.patientId === patientId)!
      const gaps = state.gaps.map((gap) => {
        if (gap.patientId !== patientId) return gap
        const completed = gap.status === 'scheduled' ? transition(gap, 'completed') : gap
        return transition(completed, target)
      })
      let metrics = incrementMetric(state.metrics, 'completed')
      if (outcome === 'normal') metrics = incrementMetric(metrics, 'gaps_closed')
      const referrals =
        outcome === 'abnormal'
          ? [
              ...state.referrals,
              {
                id: nextId('ref'),
                patientId,
                reason: 'abnormal_result',
                destination: 'Retina specialist, Lexington',
                status: 'pending' as const,
                owner: 'nav_dana',
                daysSinceResult: 0,
              },
            ]
          : outcome === 'ungradable'
            ? [
                ...state.referrals,
                {
                  id: nextId('ref'),
                  patientId,
                  reason: 'ungradable_image',
                  destination: 'Repeat screening',
                  status: 'pending' as const,
                  owner: 'nav_dana',
                  daysSinceResult: 0,
                },
              ]
            : state.referrals
      const seq = state.timeline.length
      const resultEvent = protocolEvent(
        state,
        patientId,
        'result_imported',
        'Screening result imported',
        'system',
        outcome,
      )
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
      return {
        gaps,
        metrics,
        referrals,
        results: [
          ...state.results,
          {
            id: nextId('res'),
            gapId: originalGap.id,
            outcome,
            gradable: outcome !== 'ungradable',
            capturedAt: '2026-07-01',
          },
        ],
        protocolEvents: [...state.protocolEvents, resultEvent],
        navigatorQueue: [...state.navigatorQueue, ...resultQueue],
        timeline: [...state.timeline, { id: nextId('tl'), patientId, label: 'Screening result', seq }],
      }
    }),

  startAutonomousOutreach: (patientId) =>
    set((state) => {
      if (hasOpenRedFlag(state, patientId)) {
        return {
          voiceTurns: [
            ...state.voiceTurns,
            {
              id: nextId('voice'),
              patientId,
              speaker: 'sandy' as const,
              text: RED_FLAG_LOCK_COPY,
              createdAt: now(),
              mode: 'voice' as const,
              safety: 'red_flag' as const,
            },
          ],
        }
      }

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
      const redFlagLocked = hasOpenRedFlag(state, patientId)
      const patientTurn = {
        id: nextId('voice'),
        patientId,
        speaker: 'patient' as const,
        text,
        createdAt: now(),
        mode: 'voice' as const,
        safety:
          screened.category === 'red_flag' || redFlagLocked
            ? ('red_flag' as const)
            : ('normal' as const),
      }

      if (redFlagLocked) {
        return {
          voiceTurns: [
            ...state.voiceTurns,
            patientTurn,
            {
              id: nextId('voice'),
              patientId,
              speaker: 'sandy' as const,
              text: RED_FLAG_LOCK_COPY,
              createdAt: now(),
              mode: 'voice' as const,
              safety: 'red_flag' as const,
            },
          ],
        }
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
        const event = protocolEvent(
          state,
          patientId,
          'barrier_reported',
          'Barrier reported by voice',
          'patient',
        )
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

      const event = protocolEvent(
        state,
        patientId,
        'question_answered',
        'Question answered by Sandy',
        'sandy',
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

  reset: () => {
    counter = 0
    set(clone())
  },
}))
