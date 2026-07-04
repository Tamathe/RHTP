import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import { appendAuditEvent } from './audit'
import { createInitialBackendState } from './state'

describe('appendAuditEvent', () => {
  it('records actor, action, patient, and source references without mutating the input state', () => {
    const state = createInitialBackendState()
    const updated = appendAuditEvent(state, {
      actor: 'sandy',
      action: 'voice_reply_recorded',
      patientId: HERO_ID,
      outcome: 'allowed',
      sourceIds: ['fact_ruth_gap_claims'],
      detail: 'Patient reported a ride barrier',
    })

    expect(state.auditEvents).toHaveLength(0)
    expect(updated.auditEvents).toEqual([
      expect.objectContaining({
        actor: 'sandy',
        action: 'voice_reply_recorded',
        patientId: HERO_ID,
        outcome: 'allowed',
        sourceIds: ['fact_ruth_gap_claims'],
      }),
    ])
  })
})
