import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import {
  mintAsyncAccessToken,
  readAsyncPatientContext,
  revokeAsyncAccessToken,
} from './async-access'
import { createInitialBackendState } from './state'

const OTHER_PATIENT_ID = 'pat_bg_1'

describe('async RLS access tokens', () => {
  it('mints a short-lived token scoped to one patient and pack with audit provenance', () => {
    const result = mintAsyncAccessToken(createInitialBackendState(), {
      patientId: HERO_ID,
      packIds: ['retinopathy'],
      purpose: 'async_summary',
      ttlSeconds: 300,
    })

    expect(result.token.value).toMatch(/^rhtp_async_/)
    expect(result.token.expiresAt).toBe('2026-07-04T09:05:00')
    expect(result.state.data.asyncAccessTokens.at(-1)).toEqual(
      expect.objectContaining({
        patientId: HERO_ID,
        packIds: ['retinopathy'],
        purpose: 'async_summary',
        status: 'active',
        expiresAt: '2026-07-04T09:05:00',
      }),
    )
    expect(result.state.data.asyncAccessTokens.at(-1)?.tokenHash).not.toContain(result.token.value)
    expect(result.state.auditEvents.at(-1)).toEqual(
      expect.objectContaining({
        action: 'async_access_token_minted',
        outcome: 'allowed',
        patientId: HERO_ID,
        packId: 'retinopathy',
      }),
    )
  })

  it('allows async context reads only for the token patient and pack', () => {
    const minted = mintAsyncAccessToken(createInitialBackendState(), {
      patientId: HERO_ID,
      packIds: ['retinopathy'],
      purpose: 'async_summary',
      ttlSeconds: 300,
    })

    const allowed = readAsyncPatientContext(minted.state, {
      token: minted.token.value,
      patientId: HERO_ID,
      packId: 'retinopathy',
    })
    const crossPatient = readAsyncPatientContext(minted.state, {
      token: minted.token.value,
      patientId: OTHER_PATIENT_ID,
      packId: 'retinopathy',
    })
    const crossPack = readAsyncPatientContext(minted.state, {
      token: minted.token.value,
      patientId: HERO_ID,
      packId: 'hypertension',
    })

    expect(allowed.ok).toBe(true)
    if (allowed.ok) {
      expect(allowed.context.sourceFacts.every((fact) => fact.patientId === HERO_ID)).toBe(true)
      expect(allowed.context.patient.id).toBe(HERO_ID)
    }
    expect(crossPatient).toEqual(
      expect.objectContaining({ ok: false, reason: 'patient_scope_mismatch' }),
    )
    expect(crossPack).toEqual(expect.objectContaining({ ok: false, reason: 'pack_scope_mismatch' }))
    expect(crossPatient.state.auditEvents.at(-1)).toEqual(
      expect.objectContaining({
        action: 'async_patient_context_read',
        outcome: 'blocked',
        patientId: OTHER_PATIENT_ID,
        packId: 'retinopathy',
      }),
    )
  })

  it('blocks expired and revoked async tokens', () => {
    const minted = mintAsyncAccessToken(createInitialBackendState(), {
      patientId: HERO_ID,
      packIds: ['retinopathy'],
      purpose: 'async_summary',
      ttlSeconds: 300,
    })
    const expired = readAsyncPatientContext(minted.state, {
      token: minted.token.value,
      patientId: HERO_ID,
      packId: 'retinopathy',
      now: '2026-07-04T09:05:01',
    })
    const revoked = revokeAsyncAccessToken(minted.state, {
      token: minted.token.value,
      reason: 'job_complete',
    })
    const afterRevoke = readAsyncPatientContext(revoked.state, {
      token: minted.token.value,
      patientId: HERO_ID,
      packId: 'retinopathy',
    })

    expect(expired).toEqual(expect.objectContaining({ ok: false, reason: 'token_expired' }))
    expect(revoked.state.data.asyncAccessTokens.at(-1)).toEqual(
      expect.objectContaining({ status: 'revoked', revokedAt: '2026-07-04T09:00:00' }),
    )
    expect(revoked.state.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ action: 'async_access_token_revoked', outcome: 'allowed' }),
    )
    expect(afterRevoke).toEqual(expect.objectContaining({ ok: false, reason: 'token_revoked' }))
  })
})
