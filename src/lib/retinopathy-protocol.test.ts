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

  it('keeps late-stage non-terminal states from regressing on earlier events', () => {
    expect(nextProtocolStatus('scheduled', 'patient_consented')).toBe('scheduled')
    expect(nextProtocolStatus('abnormal_referral_needed', 'barrier_reported')).toBe('abnormal_referral_needed')
  })

  it('keeps completed from moving backwards', () => {
    expect(nextProtocolStatus('completed', 'patient_consented')).toBe('completed')
  })

  it('keeps terminal and review states immutable on earlier events', () => {
    expect(nextProtocolStatus('navigator_review', 'patient_consented')).toBe('navigator_review')
    expect(nextProtocolStatus('closed_by_reconciliation', 'sandy_explained_gap')).toBe('closed_by_reconciliation')
  })

  it('allows navigator review to move into documented result or scheduling branches', () => {
    expect(nextProtocolStatus('navigator_review', 'result_imported', 'normal')).toBe('normal_closed')
    expect(nextProtocolStatus('navigator_review', 'result_imported', 'abnormal')).toBe(
      'abnormal_referral_needed',
    )
    expect(nextProtocolStatus('navigator_review', 'appointment_confirmed')).toBe('scheduled')
    expect(nextProtocolStatus('navigator_review', 'navigator_reviewed')).toBe(
      'closed_by_reconciliation',
    )
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
    expect(priorityForQueueReason('identity_match_review')).toBe('soon')
    expect(priorityForQueueReason('transportation_barrier')).toBe('routine')
  })
})
