import { HERO_ID } from '../src/data/seed'
import {
  mintAsyncAccessToken,
  readAsyncPatientContext,
  revokeAsyncAccessToken,
  type AsyncAccessDeniedReason,
} from './async-access'
import { createInitialBackendState } from './state'

export interface H2AsyncAccessGateCase {
  id: string
  ok: boolean
  decision: 'allowed' | 'blocked'
  reason?: AsyncAccessDeniedReason
  auditRecorded: boolean
}

export interface H2AsyncAccessGateReport {
  cases: H2AsyncAccessGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
    broadGrantBlocked: boolean
  }
}

const PACK_ID = 'retinopathy'
const OTHER_PATIENT_ID = 'pat_bg_1'

function auditRecorded(state: ReturnType<typeof createInitialBackendState>, action: string): boolean {
  return state.auditEvents.some((event) => event.action === action)
}

function broadGrantBlocked(): boolean {
  try {
    mintAsyncAccessToken(createInitialBackendState(), {
      patientId: '*',
      packIds: ['*'],
      purpose: 'async_summary',
      ttlSeconds: 300,
    })
    return false
  } catch {
    return true
  }
}

export function runH2AsyncAccessGate(): H2AsyncAccessGateReport {
  const minted = mintAsyncAccessToken(createInitialBackendState(), {
    patientId: HERO_ID,
    packIds: [PACK_ID],
    purpose: 'async_summary',
    ttlSeconds: 300,
  })
  const tokenRecord = minted.state.data.asyncAccessTokens.at(-1)
  const allowed = readAsyncPatientContext(minted.state, {
    token: minted.token.value,
    patientId: HERO_ID,
    packId: PACK_ID,
  })
  const crossPatient = readAsyncPatientContext(minted.state, {
    token: minted.token.value,
    patientId: OTHER_PATIENT_ID,
    packId: PACK_ID,
  })
  const crossPack = readAsyncPatientContext(minted.state, {
    token: minted.token.value,
    patientId: HERO_ID,
    packId: 'hypertension',
  })
  const expired = readAsyncPatientContext(minted.state, {
    token: minted.token.value,
    patientId: HERO_ID,
    packId: PACK_ID,
    now: '2026-07-04T09:05:01',
  })
  const revoked = revokeAsyncAccessToken(minted.state, {
    token: minted.token.value,
    reason: 'job_complete',
  })
  const afterRevoke = readAsyncPatientContext(revoked.state, {
    token: minted.token.value,
    patientId: HERO_ID,
    packId: PACK_ID,
  })

  const cases: H2AsyncAccessGateCase[] = [
    {
      id: 'gateway_minted_patient_pack_token',
      ok:
        tokenRecord?.patientId === HERO_ID &&
        tokenRecord.packIds.length === 1 &&
        tokenRecord.packIds[0] === PACK_ID &&
        tokenRecord.expiresAt === '2026-07-04T09:05:00' &&
        tokenRecord.status === 'active',
      decision: 'allowed',
      auditRecorded: auditRecorded(minted.state, 'async_access_token_minted'),
    },
    {
      id: 'matching_scope_context_read_allowed',
      ok: allowed.ok && allowed.context.patient.id === HERO_ID,
      decision: allowed.ok ? 'allowed' : 'blocked',
      reason: allowed.ok ? undefined : allowed.reason,
      auditRecorded: auditRecorded(allowed.state, 'async_patient_context_read'),
    },
    {
      id: 'cross_patient_read_blocked',
      ok: !crossPatient.ok && crossPatient.reason === 'patient_scope_mismatch',
      decision: 'blocked',
      reason: crossPatient.ok ? undefined : crossPatient.reason,
      auditRecorded: auditRecorded(crossPatient.state, 'async_patient_context_read'),
    },
    {
      id: 'cross_pack_read_blocked',
      ok: !crossPack.ok && crossPack.reason === 'pack_scope_mismatch',
      decision: 'blocked',
      reason: crossPack.ok ? undefined : crossPack.reason,
      auditRecorded: auditRecorded(crossPack.state, 'async_patient_context_read'),
    },
    {
      id: 'expired_token_blocked',
      ok: !expired.ok && expired.reason === 'token_expired',
      decision: 'blocked',
      reason: expired.ok ? undefined : expired.reason,
      auditRecorded: auditRecorded(expired.state, 'async_patient_context_read'),
    },
    {
      id: 'revoked_token_blocked',
      ok: !afterRevoke.ok && afterRevoke.reason === 'token_revoked' && revoked.ok,
      decision: 'blocked',
      reason: afterRevoke.ok ? undefined : afterRevoke.reason,
      auditRecorded:
        auditRecorded(revoked.state, 'async_access_token_revoked') &&
        auditRecorded(afterRevoke.state, 'async_patient_context_read'),
    },
  ]
  const passed = cases.filter((testCase) => testCase.ok).length
  const broadGrantIsBlocked = broadGrantBlocked()

  return {
    cases,
    summary: {
      ok: passed === cases.length && broadGrantIsBlocked,
      passed,
      total: cases.length,
      broadGrantBlocked: broadGrantIsBlocked,
    },
  }
}
