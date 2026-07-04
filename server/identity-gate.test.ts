import { describe, expect, it } from 'vitest'
import { runE2IdentityGate } from './identity-gate'

describe('runE2IdentityGate', () => {
  it('proves wrong-patient linkage is downgraded and outreach waits for confirmation', () => {
    const report = runE2IdentityGate()

    expect(report.summary.ok).toBe(true)
    expect(report.summary.passed).toBe(report.summary.total)
    expect(report.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'strong_id_only_wrong_patient',
          ok: true,
          decision: 'navigator_review',
          autonomousOutreachAllowed: false,
        }),
        expect.objectContaining({
          id: 'corroborated_pre_confirmation',
          ok: true,
          decision: 'auto_link',
          autonomousOutreachAllowed: false,
        }),
        expect.objectContaining({
          id: 'corroborated_after_confirmation',
          ok: true,
          decision: 'auto_link',
          autonomousOutreachAllowed: true,
        }),
      ]),
    )
  })
})
