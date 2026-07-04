import { createHash, randomBytes } from 'node:crypto'
import type {
  AsyncAccessToken,
  PackId,
  Patient,
  PatientConsent,
  PatientIdentity,
  ProtocolEvent,
  SourceFact,
} from '../src/types'
import { appendAuditEvent } from './audit'
import type { BackendState } from './types'

interface MintAsyncAccessTokenInput {
  patientId: string
  packIds: PackId[]
  purpose: string
  ttlSeconds: number
  now?: string
}

interface AsyncAccessTokenSecret {
  id: string
  value: string
  patientId: string
  packIds: PackId[]
  expiresAt: string
}

interface AsyncAccessValidationInput {
  token: string
  patientId: string
  packId: PackId
  now?: string
}

interface RevokeAsyncAccessTokenInput {
  token: string
  reason: string
  now?: string
}

interface AsyncPatientContext {
  patient: Patient
  consent: PatientConsent | null
  sourceFacts: SourceFact[]
  protocolEvents: ProtocolEvent[]
  patientIdentities: PatientIdentity[]
}

export type AsyncAccessDeniedReason =
  | 'token_not_found'
  | 'token_revoked'
  | 'token_expired'
  | 'patient_scope_mismatch'
  | 'pack_scope_mismatch'
  | 'patient_not_found'

export type AsyncPatientContextResult =
  | {
      ok: true
      state: BackendState
      context: AsyncPatientContext
    }
  | {
      ok: false
      state: BackendState
      reason: AsyncAccessDeniedReason
      message: string
    }

export type RevokeAsyncAccessTokenResult =
  | { ok: true; state: BackendState }
  | { ok: false; state: BackendState; reason: 'token_not_found'; message: string }

let asyncAccessCounter = 0

const DEFAULT_NOW = '2026-07-04T09:00:00'

function now(input?: string): string {
  return input ?? DEFAULT_NOW
}

function nextId(): string {
  asyncAccessCounter += 1
  return `async_${asyncAccessCounter}`
}

function toUtcMillis(value: string): number {
  return Date.parse(value.endsWith('Z') ? value : `${value}Z`)
}

function fromUtcMillis(value: number): string {
  return new Date(value).toISOString().replace('.000Z', '')
}

function addSeconds(value: string, seconds: number): string {
  return fromUtcMillis(toUtcMillis(value) + seconds * 1000)
}

function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function patientSourceFactIds(state: BackendState, patientId: string): string[] {
  return state.data.sourceFacts.filter((fact) => fact.patientId === patientId).map((fact) => fact.id)
}

function concretePackIds(packIds: PackId[]): PackId[] {
  return [...new Set(packIds.map((packId) => packId.trim()).filter(Boolean))]
}

function assertNarrowScope(input: MintAsyncAccessTokenInput): PackId[] {
  const packIds = concretePackIds(input.packIds)
  if (!input.patientId.trim() || input.patientId === '*' || packIds.length === 0 || packIds.includes('*')) {
    throw new Error('Async access tokens must be scoped to one patient and at least one concrete pack.')
  }

  if (!Number.isFinite(input.ttlSeconds) || input.ttlSeconds <= 0) {
    throw new Error('Async access tokens require a positive TTL.')
  }

  return packIds
}

function findToken(state: BackendState, token: string): AsyncAccessToken | undefined {
  const tokenHash = hashToken(token)
  return state.data.asyncAccessTokens.find((candidate) => candidate.tokenHash === tokenHash)
}

function denied(
  state: BackendState,
  input: AsyncAccessValidationInput,
  reason: AsyncAccessDeniedReason,
  message: string,
): AsyncPatientContextResult {
  return {
    ok: false,
    reason,
    message,
    state: appendAuditEvent(state, {
      actor: 'system',
      action: 'async_patient_context_read',
      outcome: 'blocked',
      patientId: input.patientId,
      packId: input.packId,
      detail: message,
    }),
  }
}

export function mintAsyncAccessToken(
  state: BackendState,
  input: MintAsyncAccessTokenInput,
): { state: BackendState; token: AsyncAccessTokenSecret } {
  const issuedAt = now(input.now)
  const packIds = assertNarrowScope(input)
  const id = nextId()
  const value = `rhtp_async_${id}_${randomBytes(18).toString('hex')}`
  const expiresAt = addSeconds(issuedAt, input.ttlSeconds)
  const tokenRecord: AsyncAccessToken = {
    id,
    patientId: input.patientId,
    packIds,
    purpose: input.purpose,
    tokenHash: hashToken(value),
    status: 'active',
    issuedAt,
    expiresAt,
  }
  const withToken = {
    ...state,
    updatedAt: issuedAt,
    data: {
      ...state.data,
      asyncAccessTokens: [...state.data.asyncAccessTokens, tokenRecord],
    },
  }
  const audited = appendAuditEvent(withToken, {
    actor: 'system',
    action: 'async_access_token_minted',
    outcome: 'allowed',
    patientId: input.patientId,
    sourceIds: patientSourceFactIds(state, input.patientId),
    packId: packIds.join(','),
    detail: `Minted async access token for purpose=${input.purpose}; expiresAt=${expiresAt}.`,
  })

  return {
    state: audited,
    token: {
      id,
      value,
      patientId: input.patientId,
      packIds,
      expiresAt,
    },
  }
}

export function readAsyncPatientContext(
  state: BackendState,
  input: AsyncAccessValidationInput,
): AsyncPatientContextResult {
  const token = findToken(state, input.token)
  if (!token) {
    return denied(state, input, 'token_not_found', 'Async access token was not found.')
  }

  if (token.status === 'revoked') {
    return denied(state, input, 'token_revoked', 'Async access token has been revoked.')
  }

  if (toUtcMillis(now(input.now)) > toUtcMillis(token.expiresAt)) {
    return denied(state, input, 'token_expired', 'Async access token has expired.')
  }

  if (token.patientId !== input.patientId) {
    return denied(state, input, 'patient_scope_mismatch', 'Async access token is scoped to a different patient.')
  }

  if (!token.packIds.includes(input.packId)) {
    return denied(state, input, 'pack_scope_mismatch', 'Async access token is scoped to a different protocol pack.')
  }

  const patient = state.data.patients.find((candidate) => candidate.id === input.patientId)
  if (!patient) {
    return denied(state, input, 'patient_not_found', 'Patient not found.')
  }

  const context: AsyncPatientContext = {
    patient,
    consent: state.data.consents.find((consent) => consent.patientId === input.patientId) ?? null,
    sourceFacts: state.data.sourceFacts.filter((fact) => fact.patientId === input.patientId),
    protocolEvents: state.data.protocolEvents.filter((event) => event.patientId === input.patientId),
    patientIdentities: state.data.patientIdentities.filter((identity) => identity.patientId === input.patientId),
  }

  return {
    ok: true,
    context,
    state: appendAuditEvent(state, {
      actor: 'system',
      action: 'async_patient_context_read',
      outcome: 'allowed',
      patientId: input.patientId,
      sourceIds: context.sourceFacts.map((fact) => fact.id),
      packId: input.packId,
      detail: `Async context read allowed for token=${token.id}.`,
    }),
  }
}

export function revokeAsyncAccessToken(
  state: BackendState,
  input: RevokeAsyncAccessTokenInput,
): RevokeAsyncAccessTokenResult {
  const token = findToken(state, input.token)
  if (!token) {
    return {
      ok: false,
      reason: 'token_not_found',
      message: 'Async access token was not found.',
      state: appendAuditEvent(state, {
        actor: 'system',
        action: 'async_access_token_revoked',
        outcome: 'failed',
        detail: 'Async access token was not found.',
      }),
    }
  }

  const revokedAt = now(input.now)
  const withRevoked = {
    ...state,
    updatedAt: revokedAt,
    data: {
      ...state.data,
      asyncAccessTokens: state.data.asyncAccessTokens.map((candidate) =>
        candidate.id === token.id
          ? {
              ...candidate,
              status: 'revoked' as const,
              revokedAt,
              revokedReason: input.reason,
            }
          : candidate,
      ),
    },
  }

  return {
    ok: true,
    state: appendAuditEvent(withRevoked, {
      actor: 'system',
      action: 'async_access_token_revoked',
      outcome: 'allowed',
      patientId: token.patientId,
      packId: token.packIds.join(','),
      detail: `Async access token ${token.id} revoked; reason=${input.reason}.`,
    }),
  }
}
