import { describe, expect, it } from 'vitest'

import { runSpecResidualGate } from './spec-residual-gate'

describe('spec residual gate', () => {
  it('tracks Appendix B residuals without turning production-only items into demo blockers', () => {
    const report = runSpecResidualGate()

    expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'appendix_b3_medium_residuals_tracked',
      'appendix_b4_cross_cutting_subsystems_tracked',
      'appendix_b5_named_capabilities_have_demo_paths',
      'appendix_b6_right_to_erasure_tracked',
      'production_residuals_are_not_demo_blockers',
    ])
    expect(report.cases.find((testCase) => testCase.id === 'appendix_b4_cross_cutting_subsystems_tracked')).toMatchObject({
      ok: true,
      detail: 'tracked=8/8',
    })
  })
})
