import { HERO_ID } from '../src/data/seed'
import type { SensitiveCategory } from '../src/types'
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

function createAdolescentState(): { state: BackendState; factId: string } {
  const state = createInitialBackendState()
  const factId = 'fact_adolescent_phq_gate'
  return {
    state: {
      ...state,
      data: {
        ...state.data,
        sourceFacts: [
          ...state.data.sourceFacts,
          {
            id: factId,
            patientId: HERO_ID,
            label: 'Confidential PHQ/GAD screening result',
            value: 'PHQ-9 result requires confidential care-team follow-up.',
            sourceKind: 'patient_reported',
            sourceName: 'RHTP PHQ/GAD screening',
            retrievedAt: '2026-07-04',
            effectiveDate: '2026-07-04',
            confidence: 'confirmed',
            patientConfirmed: true,
            navigatorOverridden: false,
            sensitiveCategory: 'adolescent',
            aiContextSuppressed: true,
          },
        ],
      },
    },
    factId,
  }
}

function addAdolescentConsent(state: BackendState): BackendState {
  return {
    ...state,
    data: {
      ...state.data,
      consents: [
        ...state.data.consents,
        {
          id: 'consent_adolescent_break_glass_gate',
          patientId: HERO_ID,
          status: 'active',
          scope: 'break_glass:emergency_care_coordination:adolescent',
          category: 'adolescent',
          version: 'v1',
          updatedAt: '2026-07-04',
        },
      ],
    },
  }
}

function request(
  state: BackendState,
  factId: string,
  category: SensitiveCategory,
  requesterKind: 'navigator' | 'guardian_proxy' = 'navigator',
) {
  return requestBreakGlassAccess(state, {
    patientId: HERO_ID,
    category,
    purpose: 'emergency_care_coordination',
    requestedBy: requesterKind === 'guardian_proxy' ? 'guardian_proxy_1' : 'nav_dana',
    requesterKind,
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

  const adolescentMissingConsentState = createAdolescentState()
  const adolescentMissingConsentRequest = request(
    adolescentMissingConsentState.state,
    adolescentMissingConsentState.factId,
    'adolescent',
  )
  const adolescentMissingConsentApproval = approveBreakGlassAccess(adolescentMissingConsentRequest.state, {
    accessId: adolescentMissingConsentRequest.access.id,
    approvedBy: 'privacy_officer',
  })

  const adolescentGuardianState = createAdolescentState()
  const adolescentGuardianRequest = request(
    addAdolescentConsent(adolescentGuardianState.state),
    adolescentGuardianState.factId,
    'adolescent',
    'guardian_proxy',
  )
  const adolescentGuardianApproval = approveBreakGlassAccess(adolescentGuardianRequest.state, {
    accessId: adolescentGuardianRequest.access.id,
    approvedBy: 'privacy_officer',
  })

  const categoryMismatchState = createPart2State()
  const categoryMismatchRequest = request(
    addAdolescentConsent(categoryMismatchState.state),
    categoryMismatchState.factId,
    'adolescent',
  )
  const categoryMismatchApproval = approveBreakGlassAccess(categoryMismatchRequest.state, {
    accessId: categoryMismatchRequest.access.id,
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
      id: 'adolescent_break_glass_requires_purpose_consent',
      ok: adolescentMissingConsentApproval.status === 'part2_consent_required',
      detail: adolescentMissingConsentApproval.status,
    },
    {
      id: 'adolescent_guardian_proxy_blocked',
      ok: adolescentGuardianApproval.status === 'guardian_proxy_blocked',
      detail: adolescentGuardianApproval.status,
    },
    {
      id: 'adolescent_break_glass_category_match_required',
      ok: categoryMismatchApproval.status === 'category_mismatch',
      detail: categoryMismatchApproval.status,
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
