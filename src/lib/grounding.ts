import type { SourceFact } from '../types'

export type GroundingFindingCode =
  | 'missing_citation'
  | 'unknown_citation'
  | 'numeric_mismatch'
  | 'unsupported_result_claim'
  | 'diagnosis_claim'
  | 'medication_change'
  | 'unsupported_claim'

export interface GroundingFinding {
  code: GroundingFindingCode
  severity: 'block'
  status: 'blocked'
  message: string
  reason: string
}

export interface QuantitativeClaim {
  kind: 'a1c' | 'months_since_screening'
  value: string
}

export interface GroundingVerificationInput {
  answer: string
  sourceFacts: SourceFact[]
  citationIds?: string[]
}

export interface GroundingVerificationResult {
  allowed: boolean
  findings: GroundingFinding[]
  blockedReasons: string[]
  supportedSourceFactIds: string[]
}

const CLINICAL_ADJACENT_PATTERNS = [
  /\ba1c\b/i,
  /\btype\s+2\s+diabetes\b/i,
  /\bdiabetes\s+diagnos/i,
  /\bdiabetic\s+retinopathy\b/i,
  /\bretinal\s+screening\s+gap\b/i,
  /\beye\s+history\b/i,
  /\bno\s+retinal\s+screening\s+claim\b/i,
  /\bscreening\s+site\b/i,
  /\bsite\s+has\s+saturday\s+appointments?\b/i,
  /\bmobile\s+camera\b/i,
  /\bride\s+support\b/i,
  /\beye\s+exam\s+came\s+back\b/i,
  /\bcame\s+back\s+normal\b/i,
  /\b(metformin|insulin|medicine|medication)\b/i,
]

const DIAGNOSIS_CLAIM_PATTERNS = [
  /\byou\s+(?:definitely\s+)?have\s+diabetic\s+retinopathy\b/i,
  /\byou\s+do\s+not\s+have\s+diabetic\s+retinopathy\b/i,
  /\byou\s+are\s+diagnosed\s+with\b/i,
  /\bi\s+diagnos(?:e|ed)\b/i,
]

const MEDICATION_CHANGE_PATTERNS = [
  /\b(?:stop|start|change|lower|raise|increase|decrease)\s+(?:your\s+)?(?:insulin|metformin|medicine|medication|dose)\b/i,
  /\byou\s+should\s+(?:stop|start|change|lower|raise|increase|decrease)\b/i,
  /\btake\s+\d+(?:\.\d+)?\s*(?:mg|units?)\b/i,
]

const NORMAL_RESULT_PATTERNS = [
  /\b(?:eye|retinal)\s+(?:exam|screening|test).{0,32}\bnormal\b/i,
  /\bcame\s+back\s+normal\b/i,
]

export function containsClinicalAdjacentClaim(answer: string): boolean {
  return CLINICAL_ADJACENT_PATTERNS.some((pattern) => pattern.test(answer))
}

export function extractQuantitativeClaims(answer: string): QuantitativeClaim[] {
  const claims: QuantitativeClaim[] = []
  const a1cPattern = /\b(A1C\s+(?:is|of|was)\s+(\d+(?:\.\d+)?)%?)/gi
  const monthsPattern = /\b(\d+)\s+months?\s+since\s+your\s+last\s+(?:eye|retinal)?\s*screening\b/gi

  for (const match of answer.matchAll(a1cPattern)) {
    const value = match[2]
    if (value) {
      claims.push({ kind: 'a1c', value })
    }
  }

  for (const match of answer.matchAll(monthsPattern)) {
    const value = match[1]
    if (value) {
      claims.push({ kind: 'months_since_screening', value })
    }
  }

  return claims
}

function normalizeText(value: string): string {
  return value.toLowerCase()
}

function hasCitedSupport(citedFacts: SourceFact[], pattern: RegExp): boolean {
  return citedFacts.some((fact) => pattern.test(`${fact.label} ${fact.value}`))
}

function sourceNumericValues(citedFacts: SourceFact[], pattern: RegExp): number[] {
  return citedFacts.flatMap((fact) => {
    if (!pattern.test(`${fact.label} ${fact.value}`)) return []

    const matches = Array.from(fact.value.matchAll(/(\d+(?:\.\d+)?)/g))
    return matches.map((match) => Number(match[1])).filter(Number.isFinite)
  })
}

function sourceA1cValues(citedFacts: SourceFact[]): number[] {
  return citedFacts.flatMap((fact) => {
    if (!/a1c/i.test(`${fact.label} ${fact.value}`)) return []

    const match = fact.value.match(/(\d+(?:\.\d+)?)/)
    return match ? [Number(match[1])] : []
  })
}

function valuesMatch(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.05
}

function finding(code: GroundingFindingCode, reason: string, message: string): GroundingFinding {
  return {
    code,
    severity: 'block',
    status: 'blocked',
    reason,
    message,
  }
}

export function verifyGrounding(input: GroundingVerificationInput): GroundingVerificationResult {
  const citationIds = input.citationIds ?? input.sourceFacts.map((fact) => fact.id)
  const citedFacts = input.sourceFacts.filter((fact) => citationIds.includes(fact.id))
  const findings: GroundingFinding[] = []
  const answer = normalizeText(input.answer)

  if (containsClinicalAdjacentClaim(input.answer) && citedFacts.length === 0) {
    findings.push(
      finding(
        'missing_citation',
        'clinical_adjacent_claim_without_sources',
        'Clinical-adjacent claims require trusted source facts.',
      ),
    )
  }

  const missingCitationIds = citationIds.filter(
    (citationId) => !input.sourceFacts.some((fact) => fact.id === citationId),
  )
  if (missingCitationIds.length > 0) {
    findings.push(
      finding(
        'unknown_citation',
        `unknown_citation:${missingCitationIds.join(',')}`,
        `Unknown citation ids: ${missingCitationIds.join(', ')}`,
      ),
    )
  }

  if (DIAGNOSIS_CLAIM_PATTERNS.some((pattern) => pattern.test(input.answer))) {
    findings.push(
      finding('diagnosis_claim', 'diagnosis_claim', 'Sandy cannot diagnose diabetic retinopathy.'),
    )
  }

  if (MEDICATION_CHANGE_PATTERNS.some((pattern) => pattern.test(input.answer))) {
    findings.push(
      finding(
        'medication_change',
        'medication_change_claim',
        'Sandy cannot recommend medication or dose changes.',
      ),
    )
  }

  if (NORMAL_RESULT_PATTERNS.some((pattern) => pattern.test(input.answer))) {
    const hasNormalResultSupport = hasCitedSupport(citedFacts, /\bnormal\b|\bclosed\b|\bcompleted\b/i)
    if (!hasNormalResultSupport) {
      findings.push(
        finding(
          'unsupported_result_claim',
          'unsupported_normal_result_claim',
          'A normal screening result claim must be supported by a cited result fact.',
        ),
      )
    }
  }

  for (const claim of extractQuantitativeClaims(input.answer)) {
    const claimValue = Number(claim.value)
    const sourceValues =
      claim.kind === 'a1c'
        ? sourceA1cValues(citedFacts)
        : sourceNumericValues(citedFacts, /screening|retinal|eye|gap/i)
    if (!sourceValues.some((value) => valuesMatch(value, claimValue))) {
      findings.push(
        finding(
          'numeric_mismatch',
          `unsupported_numeric_claim:${claim.kind}:${claim.value}`,
          `Claimed ${claim.kind} ${claim.value} does not match cited source facts.`,
        ),
      )
    }
  }

  const claimsRetinalGap =
    citedFacts.length > 0 && /retinal\s+screening\s+gap|no\s+retinal\s+screening\s+claim/.test(answer)
  if (claimsRetinalGap && !hasCitedSupport(citedFacts, /retinal\s+screening|screening\s+claim|gap/i)) {
    findings.push(
      finding(
        'missing_citation',
        'unsupported_retinal_screening_gap_claim',
        'The retinal screening gap claim is not supported by cited facts.',
      ),
    )
  }

  const claimsDiabetes = citedFacts.length > 0 && /type\s+2\s+diabetes|diabetes\s+diagnos/.test(answer)
  if (claimsDiabetes && !hasCitedSupport(citedFacts, /diabetes/i)) {
    findings.push(
      finding(
        'missing_citation',
        'unsupported_diabetes_claim',
        'The diabetes claim is not supported by cited facts.',
      ),
    )
  }

  const claimsSiteAvailability =
    citedFacts.length > 0 && /(site|mobile camera).{0,80}(saturday|ride support)/.test(answer)
  if (claimsSiteAvailability && !hasCitedSupport(citedFacts, /site|mobile camera|saturday|ride support/i)) {
    findings.push(
      finding(
        'missing_citation',
        'unsupported_site_availability_claim',
        'The site availability claim is not supported by cited facts.',
      ),
    )
  }

  return {
    allowed: findings.length === 0,
    findings,
    blockedReasons: findings.map((item) => item.reason),
    supportedSourceFactIds: citedFacts.map((fact) => fact.id),
  }
}
