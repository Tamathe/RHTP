import { describe, expect, it } from 'vitest'
import { runH2AsyncAccessGate } from './async-access-gate'

describe('H2 async access gate', () => {
  it('proves scoped async tokens without a standing broad grant', () => {
    const report = runH2AsyncAccessGate()

    expect(report.summary).toEqual({
      ok: true,
      passed: 6,
      total: 6,
      broadGrantBlocked: true,
    })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'gateway_minted_patient_pack_token',
      'matching_scope_context_read_allowed',
      'cross_patient_read_blocked',
      'cross_pack_read_blocked',
      'expired_token_blocked',
      'revoked_token_blocked',
    ])
    expect(report.cases.every((testCase) => testCase.auditRecorded)).toBe(true)
  })
})
