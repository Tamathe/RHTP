import { describe, expect, it } from 'vitest'

import { runNavigatorEnrollmentGate } from './navigator-enrollment-gate'

describe('navigator enrollment gate', () => {
  it('passes the no-PHI stakeholder-demo navigator enrollment checks', () => {
    const report = runNavigatorEnrollmentGate()

    expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'navigator_enrollment_is_synthetic_no_phi',
      'navigator_enrollment_links_proofed_in_person_identity',
      'navigator_enrollment_is_offline_capable',
      'navigator_enrollment_trust_transfer_ready',
      'real_identity_proofing_and_account_creation_stay_blocked',
    ])
  })
})
