import { describe, expect, it } from 'vitest'

import { runP8WritebackGate } from './p8-writeback-gate'

describe('runP8WritebackGate', () => {
  it('passes the local P8 clinician writeback boundary cases', () => {
    const report = runP8WritebackGate()

    expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'p8_writeback_requires_navigator_signature',
      'p8_prohibited_content_blocked_and_audited',
      'p8_signed_summary_can_be_approved_and_persisted',
      'p8_clinician_surface_emr_launch_only',
      'p8_expansion_summary_uses_synthetic_multi_county_cohort',
    ])
  })
})
