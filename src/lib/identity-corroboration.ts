import type { NavigatorQueueReason } from '../types'

export type StrongIdentifierKind = 'payer_member_id' | 'beneficiary_id' | 'mpi_id'
export type IdentityMatchMethod = 'deterministic' | 'probabilistic'
export type IdentityMatchDecision = 'auto_link' | 'navigator_review' | 'no_match'

export interface StrongIdentifier {
  kind: StrongIdentifierKind
  value: string
}

export interface IdentityCandidateRecord {
  patientId: string
  name: string
  dateOfBirth?: string
  strongIds?: Partial<Record<StrongIdentifierKind, string>>
}

export interface ExternalIdentityRecord {
  externalSystem: string
  externalRecordId: string
  matchMethod: IdentityMatchMethod
  matchConfidence: number
  strongIdentifier?: StrongIdentifier
  name?: string
  dateOfBirth?: string
  patientConfirmed?: boolean
}

export interface IdentityMatchQuality {
  method: IdentityMatchMethod
  confidence: number
  strongIdMatched: boolean
  demographicCorroborated: boolean
  matchedOn: string[]
}

export interface IdentityCorroborationResult {
  decision: IdentityMatchDecision
  patientId: string
  externalSystem: string
  externalRecordId: string
  patientConfirmed: boolean
  autonomousOutreachAllowed: boolean
  queueReason?: NavigatorQueueReason
  matchQuality: IdentityMatchQuality
  reason: string
}

const AUTO_LINK_CONFIDENCE_FLOOR = 0.95

function normalizeName(value: string | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function valuesMatch(left: string | undefined, right: string | undefined): boolean {
  return Boolean(left && right && left === right)
}

function namesMatch(left: string | undefined, right: string | undefined): boolean {
  const normalizedLeft = normalizeName(left)
  const normalizedRight = normalizeName(right)

  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight)
}

function strongIdMatches(candidate: IdentityCandidateRecord, external: ExternalIdentityRecord): boolean {
  if (!external.strongIdentifier) return false
  return candidate.strongIds?.[external.strongIdentifier.kind] === external.strongIdentifier.value
}

export function canAutonomouslyUseExternalRecord(result: IdentityCorroborationResult): boolean {
  return result.decision === 'auto_link' && result.patientConfirmed
}

export function corroborateIdentity(
  candidate: IdentityCandidateRecord,
  external: ExternalIdentityRecord,
): IdentityCorroborationResult {
  const matchedOn: string[] = []
  const strongIdMatched = strongIdMatches(candidate, external)
  if (strongIdMatched && external.strongIdentifier) {
    matchedOn.push(external.strongIdentifier.kind)
  }

  const dobMatched = valuesMatch(candidate.dateOfBirth, external.dateOfBirth)
  if (dobMatched) matchedOn.push('date_of_birth')

  const nameMatched = namesMatch(candidate.name, external.name)
  if (nameMatched) matchedOn.push('name')

  const demographicCorroborated = dobMatched || nameMatched
  const patientConfirmed = external.patientConfirmed === true
  const matchQuality: IdentityMatchQuality = {
    method: external.matchMethod,
    confidence: external.matchConfidence,
    strongIdMatched,
    demographicCorroborated,
    matchedOn,
  }

  const base = {
    patientId: candidate.patientId,
    externalSystem: external.externalSystem,
    externalRecordId: external.externalRecordId,
    patientConfirmed,
    matchQuality,
  }

  if (
    external.matchMethod === 'deterministic' &&
    external.matchConfidence === 1 &&
    strongIdMatched &&
    !demographicCorroborated
  ) {
    return {
      ...base,
      decision: 'navigator_review',
      autonomousOutreachAllowed: false,
      queueReason: 'identity_match_review',
      reason: 'Strong identifier matched, but no independent demographic corroborated the link.',
    }
  }

  if (
    external.matchMethod === 'deterministic' &&
    external.matchConfidence === 1 &&
    strongIdMatched &&
    demographicCorroborated
  ) {
    const result = {
      ...base,
      decision: 'auto_link' as const,
      autonomousOutreachAllowed: false,
      reason: patientConfirmed
        ? 'Strong identifier and independent demographic corroborated the link after patient confirmation.'
        : 'Strong identifier and independent demographic corroborated the link; patient confirmation is still required before autonomous outreach.',
    }

    return { ...result, autonomousOutreachAllowed: canAutonomouslyUseExternalRecord(result) }
  }

  if (external.matchMethod === 'probabilistic' || external.matchConfidence < AUTO_LINK_CONFIDENCE_FLOOR) {
    return {
      ...base,
      decision: 'navigator_review',
      autonomousOutreachAllowed: false,
      queueReason: 'identity_match_review',
      reason: 'Identity confidence is below the auto-link threshold or uses probabilistic matching.',
    }
  }

  return {
    ...base,
    decision: 'no_match',
    autonomousOutreachAllowed: false,
    queueReason: 'low_confidence_identity_or_gap_match',
    reason: 'Identity record did not meet the local auto-link criteria.',
  }
}
