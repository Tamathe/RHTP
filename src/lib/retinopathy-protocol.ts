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
