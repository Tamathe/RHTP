import type { GapStatus, ResultOutcome, ScreeningGap } from '../types'

export const LEGAL_TRANSITIONS: Record<GapStatus, GapStatus[]> = {
  overdue: ['engaged', 'closed'],
  engaged: ['scheduled', 'closed'],
  scheduled: ['completed'],
  completed: ['closed', 'referral', 'repeat'],
  closed: [],
  referral: [],
  repeat: ['scheduled'],
}

export const canTransition = (from: GapStatus, to: GapStatus): boolean =>
  LEGAL_TRANSITIONS[from].includes(to)

export const transition = (gap: ScreeningGap, to: GapStatus): ScreeningGap => {
  if (!canTransition(gap.status, to)) {
    throw new Error(`Illegal transition ${gap.status} -> ${to}`)
  }
  return { ...gap, status: to }
}

export const outcomeToStatus = (outcome: ResultOutcome): GapStatus => {
  const map: Record<ResultOutcome, GapStatus> = {
    normal: 'closed',
    abnormal: 'referral',
    ungradable: 'repeat',
  }
  return map[outcome]
}
