import { HERO_ID } from '../src/data/seed'
import type { BackendState } from './types'
import {
  approveBreakGlassAccess,
  completeBreakGlassPostHocReview,
  readSegmentedFactsWithBreakGlass,
  requestBreakGlassAccess,
} from './break-glass-access'
import { ingestHieDischargeEvent } from './part2-suppression'
import { createInitialBackendState } from './state'

export interface H4BreakGlassGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface H4BreakGlassGateReport {
  cases: H4BreakGlassGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

function createPart2State(): { state: BackendState; factId: string } {
  const result = ingestHieDischargeEvent(createInitialBackendState(), {
    patientId: HERO_ID,
    sourceName: 'KHIE ADT feed',
    facilityName: 'Appalachian Recovery Center',
    dischargeDisposition: 'substance_use_treatment_discharge',
    effectiveDate: '2026-07-03',
    retrievedAt: '2026-07-04',
    fhirRef: 'Encounter/part2-sensitive',
  })
  const factId = result.acceptedSourceFact?.id
  if (!factId) throw new Error('Expected restricted Part 2 fact')
  return { state: result.state, factId }
}

function addPart2Consent(state: BackendState): BackendState {
  return {
    ...state,
    data: {
      ...state.data,
      consents: [
        ...state.data.consents,
        {
          id: 'consent_part2_break_glass_gate',
          patientId: HERO_ID,
          status: 'active',
          scope: 'break_glass:emergency_care_coordination:part2_sud',
          category: 'part2_sud',
          version: 'v1',
          updatedAt: '2026-07-04',
        },
      ],
    },
  }
}

function request(state: BackendState, factId: string, category: 'part2_sud' | 'adolescent') {
  return requestBreakGlassAccess(state, {
    patientId: HERO_ID,
    category,
    purpose: 'emergency_care_coordination',
    requestedBy: 'nav_dana',
    sourceFactIds: [factId],
  })
}

export function runH4BreakGlassGate(): H4BreakGlassGateReport {
  const missingConsent = createPart2State()
  const missingConsentRequest = request(missingConsent.state, missingConsent.factId, 'part2_sud')
  const missingConsentApproval = approveBreakGlassAccess(missingConsentRequest.state, {
    accessId: missingConsentRequest.access.id,
    approvedBy: 'privacy_officer',
  })

  const approvedState = createPart2State()
  const approvedRequest = request(addPart2Consent(approvedState.state), approvedState.factId, 'part2_sud')
  const approved = approveBreakGlassAccess(approvedRequest.state, {
    accessId: approvedRequest.access.id,
    approvedBy: 'privacy_officer',
  })
  const expiredRead = readSegmentedFactsWithBreakGlass(approved.state, {
    accessId: approvedRequest.access.id,
    now: '2026-07-04T10:00:00',
  })

  const reviewState = createPart2State()
  const reviewRequest = request(addPart2Consent(reviewState.state), reviewState.factId, 'part2_sud')
  const reviewApproved = approveBreakGlassAccess(reviewRequest.state, {
    accessId: reviewRequest.access.id,
    approvedBy: 'privacy_officer',
  })
  const reviewed = completeBreakGlassPostHocReview(reviewApproved.state, {
    accessId: reviewRequest.access.id,
    reviewer: 'privacy_officer',
    outcome: 'confirmed_appropriate',
  })

  const adolescentState = createPart2State()
  const adolescentRequest = request(addPart2Consent(adolescentState.state), adolescentState.factId, 'adolescent')
  const adolescentApproval = approveBreakGlassAccess(adolescentRequest.state, {
    accessId: adolescentRequest.access.id,
    approvedBy: 'privacy_officer',
  })

  const cases: H4BreakGlassGateCase[] = [
    {
      id: 'part2_break_glass_requires_purpose_consent',
      ok: missingConsentApproval.status === 'part2_consent_required',
      detail: missingConsentApproval.status,
    },
    {
      id: 'approved_break_glass_has_ttl',
      ok:
        approved.status === 'active' &&
        approved.access?.expiresAt === '2026-07-04T09:30:00' &&
        approved.access.reviewRequired,
      detail: `${approved.status};expiresAt=${approved.access?.expiresAt ?? 'none'}`,
    },
    {
      id: 'expired_break_glass_read_blocked',
      ok: expiredRead.status === 'expired' && expiredRead.facts.length === 0,
      detail: expiredRead.status,
    },
    {
      id: 'post_hoc_review_recorded',
      ok:
        reviewed.status === 'reviewed' &&
        reviewed.access?.reviewOutcome === 'confirmed_appropriate' &&
        reviewed.state.auditEvents.some((event) => event.action === 'break_glass_post_hoc_review'),
      detail: reviewed.status,
    },
    {
      id: 'adolescent_policy_fails_closed',
      ok: adolescentApproval.status === 'adolescent_policy_required',
      detail: adolescentApproval.status,
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
