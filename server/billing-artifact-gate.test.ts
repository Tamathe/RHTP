import { describe, expect, it } from 'vitest'

import { runBillingArtifactGate } from './billing-artifact-gate'

describe('runBillingArtifactGate', () => {
  it('passes the local no-PHI billing artifact proof cases', () => {
    const report = runBillingArtifactGate()

    expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'billing_records_are_synthetic_no_phi',
      'ccm_minutes_are_documented',
      'rpm_reading_days_meet_demo_floor',
      'artifacts_have_source_event_links',
      'claim_submission_stays_blocked',
    ])
  })
})
