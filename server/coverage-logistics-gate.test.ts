import { describe, expect, it } from 'vitest'

import { runCoverageLogisticsGate } from './coverage-logistics-gate'

describe('coverage logistics gate', () => {
  it('passes the no-PHI stakeholder-demo coverage and logistics checks', () => {
    const report = runCoverageLogisticsGate()

    expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'coverage_options_are_synthetic_no_phi',
      'coverage_options_link_to_sites',
      'ride_resources_resolve_to_kentucky_directory',
      'coverage_requires_navigator_confirmation',
      'real_adjudication_and_booking_stay_blocked',
    ])
  })
})
