import { create } from 'zustand'
import { seed, type SeedState } from '../data/seed'
import { incrementMetric } from '../lib/metrics'
import { outcomeToStatus, transition } from '../lib/screening-gap'
import type { BarrierType, ResultOutcome } from '../types'

interface StoreState extends SeedState {
  askQuestion: (patientId: string, input: string, surface: string) => void
  reportBarrier: (patientId: string, type: BarrierType, detail: string) => void
  reportAlreadyCompleted: (patientId: string) => void
  scheduleScreening: (patientId: string, siteId: string, when: string) => void
  enterResult: (patientId: string, outcome: ResultOutcome) => void
  reset: () => void
}

const clone = (): SeedState => structuredClone(seed)

let counter = 0

const nextId = (prefix: string): string => `${prefix}_${++counter}`

export const useStore = create<StoreState>((set) => ({
  ...clone(),

  askQuestion: (patientId, input, surface) =>
    set((state) => {
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
      }
    }),

  reportBarrier: (patientId, type, detail) =>
    set((state) => {
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
        timeline: [
          ...state.timeline,
          { id: nextId('tl'), patientId, label: 'Barrier reported', seq },
          { id: nextId('tl'), patientId, label: 'Navigator task created', seq: seq + 1 },
        ],
      }
    }),

  reportAlreadyCompleted: (patientId) =>
    set((state) => {
      const gaps = state.gaps.map((gap) =>
        gap.patientId === patientId ? transition(gap, 'closed') : gap,
      )
      const seq = state.timeline.length
      return {
        gaps,
        metrics: incrementMetric(state.metrics, 'gaps_closed'),
        timeline: [
          ...state.timeline,
          { id: nextId('tl'), patientId, label: 'Reported already completed', seq },
        ],
      }
    }),

  scheduleScreening: (patientId, siteId, when) =>
    set((state) => {
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
        timeline: [...state.timeline, { id: nextId('tl'), patientId, label: 'Screening result', seq }],
      }
    }),

  reset: () => {
    counter = 0
    set(clone())
  },
}))
