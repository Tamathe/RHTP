import { describe, expect, it } from 'vitest'

import {
  billingEvidenceIsPrototypeSafe,
  summarizeBillingEvidence,
} from './billing-artifacts'
import type { BillingEvidenceRecord } from '../types'

const records: BillingEvidenceRecord[] = [
  {
    id: 'bill_ccm_ruth_july',
    patientId: 'pat_ruthann',
    code: 'ccm',
    label: 'CCM monthly care management time',
    month: '2026-07',
    minutes: 22,
    readingDays: 0,
    documentedArtifactIds: ['audit_nav_call', 'care_plan_update'],
    sourceEventIds: ['proto_ruth_patient_consented'],
    reviewedByNavigator: true,
    synthetic: true,
    claimSubmissionReady: false,
    blockers: ['prototype_no_claim_submission'],
    notes: 'Synthetic navigator time evidence for stakeholder demo.',
  },
  {
    id: 'bill_rpm_ruth_july',
    patientId: 'pat_ruthann',
    code: 'rpm',
    label: 'RPM reading-day evidence',
    month: '2026-07',
    minutes: 0,
    readingDays: 18,
    documentedArtifactIds: ['device_reading_summary'],
    sourceEventIds: ['proto_ruth_gap_imported'],
    reviewedByNavigator: true,
    synthetic: true,
    claimSubmissionReady: false,
    blockers: ['prototype_no_claim_submission'],
    notes: 'Synthetic reading-day count; no real device stream.',
  },
  {
    id: 'bill_chw_ruth_july',
    patientId: 'pat_ruthann',
    code: 'chw',
    label: 'CHW navigation support',
    month: '2026-07',
    minutes: 35,
    readingDays: 0,
    documentedArtifactIds: ['resource_connection_note'],
    sourceEventIds: ['proto_ruth_patient_consented'],
    reviewedByNavigator: false,
    synthetic: true,
    claimSubmissionReady: false,
    blockers: ['navigator_review_required', 'prototype_no_claim_submission'],
    notes: 'Synthetic resource-navigation evidence awaiting review.',
  },
]

describe('billing artifacts', () => {
  it('summarizes synthetic billing evidence without making a claim-submission assertion', () => {
    expect(summarizeBillingEvidence(records)).toEqual({
      blockedFromSubmission: true,
      codeCount: 3,
      documentedArtifacts: 4,
      readyForReview: 2,
      rpmReadingDays: 18,
      totalMinutes: 57,
    })
  })

  it('requires every billing evidence record to stay synthetic and non-submitting', () => {
    expect(billingEvidenceIsPrototypeSafe(records)).toBe(true)
    expect(
      billingEvidenceIsPrototypeSafe([
        { ...records[0], synthetic: false },
        { ...records[1], claimSubmissionReady: true },
      ]),
    ).toBe(false)
  })
})
