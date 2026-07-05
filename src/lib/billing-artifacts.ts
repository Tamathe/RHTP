import type { BillingEvidenceRecord } from '../types'

export interface BillingEvidenceSummary {
  blockedFromSubmission: boolean
  codeCount: number
  documentedArtifacts: number
  readyForReview: number
  rpmReadingDays: number
  totalMinutes: number
}

export function billingEvidenceIsPrototypeSafe(records: BillingEvidenceRecord[]): boolean {
  return records.every((record) => record.synthetic && !record.claimSubmissionReady)
}

export function summarizeBillingEvidence(records: BillingEvidenceRecord[]): BillingEvidenceSummary {
  const codes = new Set(records.map((record) => record.code))

  return {
    blockedFromSubmission: records.some((record) => !record.claimSubmissionReady),
    codeCount: codes.size,
    documentedArtifacts: records.reduce((total, record) => total + record.documentedArtifactIds.length, 0),
    readyForReview: records.filter((record) => record.reviewedByNavigator && record.blockers.length === 1).length,
    rpmReadingDays: records.reduce((total, record) => total + record.readingDays, 0),
    totalMinutes: records.reduce((total, record) => total + record.minutes, 0),
  }
}
