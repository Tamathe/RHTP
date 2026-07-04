import type {
  BreakGlassAccess,
  BreakGlassReviewOutcome,
  SensitiveCategory,
  SourceFact,
} from '../src/types'
import { appendAuditEvent } from './audit'
import type { BackendState } from './types'

export interface BreakGlassRequestInput {
  patientId: string
  category: SensitiveCategory
  purpose: string
  requestedBy: string
  sourceFactIds: string[]
}

export interface BreakGlassApproveInput {
  accessId: string
  approvedBy: string
}

export interface BreakGlassReadInput {
  accessId: string
  now: string
}

export interface BreakGlassReviewInput {
  accessId: string
  reviewer: string
  outcome: BreakGlassReviewOutcome
}

export interface BreakGlassRequestResult {
  state: BackendState
  status: 'requested'
  access: BreakGlassAccess
}

export interface BreakGlassApprovalResult {
  state: BackendState
  status: 'active' | 'part2_consent_required' | 'adolescent_policy_required' | 'not_found' | 'not_requested'
  access?: BreakGlassAccess
}

export interface BreakGlassReadResult {
  state: BackendState
  status: 'allowed' | 'expired' | 'not_found' | 'not_active'
  facts: SourceFact[]
}

export interface BreakGlassReviewResult {
  state: BackendState
  status: 'reviewed' | 'not_found'
  access?: BreakGlassAccess
}

type KentuckyAdolescentPolicyStatus = 'legal_review_required' | 'approved'

export const kentuckyAdolescentPolicy: { status: KentuckyAdolescentPolicyStatus; note: string } = {
  status: 'legal_review_required',
  note: 'Adolescent-confidential access remains fail-closed until Kentucky minor-consent ages and proxy disclosure rules are approved by legal/clinical owners.',
}

const NOW = '2026-07-04T09:00:00'
const EXPIRES_AT = '2026-07-04T09:30:00'
let breakGlassCounter = 0

function nextId(): string {
  breakGlassCounter += 1
  return `breakglass_${breakGlassCounter}`
}

function upsertAccess(state: BackendState, access: BreakGlassAccess): BackendState {
  const exists = state.data.breakGlassAccesses.some((item) => item.id === access.id)
  return {
    ...state,
    data: {
      ...state.data,
      breakGlassAccesses: exists
        ? state.data.breakGlassAccesses.map((item) => (item.id === access.id ? access : item))
        : [...state.data.breakGlassAccesses, access],
    },
  }
}

function findAccess(state: BackendState, accessId: string): BreakGlassAccess | undefined {
  return state.data.breakGlassAccesses.find((access) => access.id === accessId)
}

function purposeConsentScope(category: SensitiveCategory, purpose: string): string {
  return `break_glass:${purpose}:${category}`
}

function hasPurposeSpecificConsent(state: BackendState, access: BreakGlassAccess): boolean {
  if (access.category === 'part2_sud') {
    return state.data.consents.some(
      (consent) =>
        consent.patientId === access.patientId &&
        consent.status === 'active' &&
        consent.category === 'part2_sud' &&
        consent.scope === purposeConsentScope(access.category, access.purpose),
    )
  }

  return state.data.consents.some(
    (consent) =>
      consent.patientId === access.patientId &&
      consent.status === 'active' &&
      consent.scope === purposeConsentScope(access.category, access.purpose),
  )
}

function denyAccess(
  state: BackendState,
  access: BreakGlassAccess,
  status: BreakGlassApprovalResult['status'],
  detail: string,
): BreakGlassApprovalResult {
  const denied: BreakGlassAccess = { ...access, status: 'denied' }
  const updated = upsertAccess(state, denied)
  return {
    state: appendAuditEvent(updated, {
      actor: 'system',
      action: 'break_glass_access',
      outcome: 'blocked',
      patientId: access.patientId,
      sourceIds: access.sourceFactIds,
      detail,
    }),
    status,
    access: denied,
  }
}

export function requestBreakGlassAccess(
  state: BackendState,
  input: BreakGlassRequestInput,
): BreakGlassRequestResult {
  const access: BreakGlassAccess = {
    id: nextId(),
    patientId: input.patientId,
    category: input.category,
    purpose: input.purpose,
    requestedBy: input.requestedBy,
    status: 'requested',
    issuedAt: NOW,
    reviewRequired: true,
    sourceFactIds: input.sourceFactIds,
  }
  const updated = upsertAccess(state, access)

  return {
    state: appendAuditEvent(updated, {
      actor: 'navigator',
      action: 'break_glass_requested',
      outcome: 'allowed',
      patientId: input.patientId,
      sourceIds: input.sourceFactIds,
      detail: `Break-glass access requested for category=${input.category}; purpose=${input.purpose}.`,
    }),
    status: 'requested',
    access,
  }
}

export function approveBreakGlassAccess(
  state: BackendState,
  input: BreakGlassApproveInput,
): BreakGlassApprovalResult {
  const access = findAccess(state, input.accessId)
  if (!access) {
    return { state, status: 'not_found' }
  }
  if (access.status !== 'requested') {
    return { state, status: 'not_requested', access }
  }
  if (access.category === 'adolescent' && kentuckyAdolescentPolicy.status !== 'approved') {
    return denyAccess(
      state,
      access,
      'adolescent_policy_required',
      'Adolescent-confidential break-glass access failed closed because Kentucky minor-consent policy is not approved.',
    )
  }
  if (!hasPurposeSpecificConsent(state, access)) {
    return denyAccess(
      state,
      access,
      'part2_consent_required',
      `Break-glass access blocked because purpose-specific consent ${purposeConsentScope(
        access.category,
        access.purpose,
      )} is missing.`,
    )
  }

  const active: BreakGlassAccess = {
    ...access,
    status: 'active',
    approvedBy: input.approvedBy,
    expiresAt: EXPIRES_AT,
    reviewRequired: true,
  }
  const updated = upsertAccess(state, active)

  return {
    state: appendAuditEvent(updated, {
      actor: 'system',
      action: 'break_glass_access',
      outcome: 'allowed',
      patientId: access.patientId,
      sourceIds: access.sourceFactIds,
      detail: `Break-glass access approved for category=${access.category}; expiresAt=${EXPIRES_AT}; postHocReviewRequired=true.`,
    }),
    status: 'active',
    access: active,
  }
}

export function readSegmentedFactsWithBreakGlass(
  state: BackendState,
  input: BreakGlassReadInput,
): BreakGlassReadResult {
  const access = findAccess(state, input.accessId)
  if (!access) {
    return { state, status: 'not_found', facts: [] }
  }
  if (access.status !== 'active') {
    return { state, status: 'not_active', facts: [] }
  }
  if (!access.expiresAt || input.now > access.expiresAt) {
    const expired = upsertAccess(state, { ...access, status: 'expired' })
    return {
      state: appendAuditEvent(expired, {
        actor: 'system',
        action: 'break_glass_segmented_read',
        outcome: 'blocked',
        patientId: access.patientId,
        sourceIds: access.sourceFactIds,
        detail: 'Break-glass segmented read blocked because the access window expired.',
      }),
      status: 'expired',
      facts: [],
    }
  }

  const facts = state.data.sourceFacts
    .filter((fact) => access.sourceFactIds.includes(fact.id))
    .map((fact) => ({
      ...fact,
      sensitiveCategory: access.category,
      aiContextSuppressed: true,
    }))

  return {
    state: appendAuditEvent(state, {
      actor: 'system',
      action: 'break_glass_segmented_read',
      outcome: 'allowed',
      patientId: access.patientId,
      sourceIds: facts.map((fact) => fact.id),
      detail: `Break-glass segmented read returned ${facts.length} fact(s).`,
    }),
    status: 'allowed',
    facts,
  }
}

export function completeBreakGlassPostHocReview(
  state: BackendState,
  input: BreakGlassReviewInput,
): BreakGlassReviewResult {
  const access = findAccess(state, input.accessId)
  if (!access) {
    return { state, status: 'not_found' }
  }

  const reviewed: BreakGlassAccess = {
    ...access,
    status: 'reviewed',
    reviewedAt: NOW,
    reviewer: input.reviewer,
    reviewOutcome: input.outcome,
    reviewRequired: false,
  }
  const updated = upsertAccess(state, reviewed)

  return {
    state: appendAuditEvent(updated, {
      actor: 'system',
      action: 'break_glass_post_hoc_review',
      outcome: 'allowed',
      patientId: access.patientId,
      sourceIds: access.sourceFactIds,
      detail: `Break-glass post-hoc review recorded with outcome=${input.outcome}.`,
    }),
    status: 'reviewed',
    access: reviewed,
  }
}
