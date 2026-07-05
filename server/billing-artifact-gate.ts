import { billingEvidenceIsPrototypeSafe, summarizeBillingEvidence } from '../src/lib/billing-artifacts'
import { createInitialBackendState } from './state'

export interface BillingArtifactGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface BillingArtifactGateReport {
  cases: BillingArtifactGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

export function runBillingArtifactGate(): BillingArtifactGateReport {
  const state = createInitialBackendState()
  const records = state.data.billingEvidenceRecords
  const summary = summarizeBillingEvidence(records)
  const protocolEventIds = new Set(state.data.protocolEvents.map((event) => event.id))
  const ccm = records.find((record) => record.code === 'ccm')
  const allSourceEventsResolve = records.every(
    (record) =>
      record.sourceEventIds.length > 0 && record.sourceEventIds.every((eventId) => protocolEventIds.has(eventId)),
  )
  const allSubmissionBlocked = records.every(
    (record) => !record.claimSubmissionReady && record.blockers.includes('prototype_no_claim_submission'),
  )

  const cases: BillingArtifactGateCase[] = [
    {
      id: 'billing_records_are_synthetic_no_phi',
      ok: records.length >= 4 && billingEvidenceIsPrototypeSafe(records),
      detail: `records=${records.length};prototypeSafe=${billingEvidenceIsPrototypeSafe(records)}`,
    },
    {
      id: 'ccm_minutes_are_documented',
      ok:
        ccm !== undefined &&
        ccm.minutes >= 20 &&
        ccm.documentedArtifactIds.length >= 2 &&
        ccm.reviewedByNavigator,
      detail:
        ccm === undefined
          ? 'missing ccm record'
          : `minutes=${ccm.minutes};artifacts=${ccm.documentedArtifactIds.length};reviewed=${ccm.reviewedByNavigator}`,
    },
    {
      id: 'rpm_reading_days_meet_demo_floor',
      ok: summary.rpmReadingDays >= 16,
      detail: `readingDays=${summary.rpmReadingDays}`,
    },
    {
      id: 'artifacts_have_source_event_links',
      ok: allSourceEventsResolve,
      detail: allSourceEventsResolve ? 'all source event ids resolve' : 'missing source event link',
    },
    {
      id: 'claim_submission_stays_blocked',
      ok: summary.blockedFromSubmission && allSubmissionBlocked,
      detail: `blocked=${summary.blockedFromSubmission};allRecordsBlocked=${allSubmissionBlocked}`,
    },
  ]
  const passed = cases.filter((testCase) => testCase.ok).length

  return {
    cases,
    summary: {
      ok: passed === cases.length,
      passed,
      total: cases.length,
    },
  }
}
