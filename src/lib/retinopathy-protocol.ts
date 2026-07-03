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

const PROTOCOL_STATE_ORDER: Record<ProtocolStatus, number> = {
  identified: 0,
  patient_contactable: 1,
  explained: 2,
  barrier_collected: 3,
  site_matched: 4,
  scheduled: 5,
  completed: 6,
  normal_closed: 7,
  abnormal_referral_needed: 8,
  repeat_needed: 9,
  navigator_review: 10,
  closed_by_reconciliation: 11,
}

const TERMINAL_STATES = new Set<ProtocolStatus>(['normal_closed', 'closed_by_reconciliation'])

const REVIEW_EXIT_STATES = new Set<ProtocolStatus>([
  'site_matched',
  'scheduled',
  'normal_closed',
  'abnormal_referral_needed',
  'repeat_needed',
  'closed_by_reconciliation',
])

function shouldTransition(current: ProtocolStatus, next: ProtocolStatus): boolean {
  if (TERMINAL_STATES.has(current)) return false
  if (current === 'navigator_review') return REVIEW_EXIT_STATES.has(next)
  return PROTOCOL_STATE_ORDER[next] >= PROTOCOL_STATE_ORDER[current]
}

export function nextProtocolStatus(
  current: ProtocolStatus,
  eventType: ProtocolEventType,
  outcome?: ResultOutcome,
): ProtocolStatus {
  if (eventType === 'result_imported') {
    if (!outcome) {
      return current
    }

    const next = RESULT_TRANSITIONS[outcome]
    return shouldTransition(current, next) ? next : current
  }

  const next = EVENT_TRANSITIONS[eventType] ?? current
  return shouldTransition(current, next) ? next : current
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
