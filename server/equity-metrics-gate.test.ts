import { describe, expect, it } from 'vitest'

import { runEquityMetricsGate } from './equity-metrics-gate'

describe('equity metrics gate', () => {
  it('passes the local no-PHI equity metric proof cases', () => {
    const report = runEquityMetricsGate()

    expect(report.summary).toEqual({ ok: true, passed: 6, total: 6 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'equity_snapshots_are_synthetic_aggregate_rows',
      'outcome_metrics_have_stratified_snapshots',
      'small_cells_suppressed_at_projection',
      'device_owner_disparity_raises_program_alarm',
      'device_metric_requires_claims_floor',
      'equity_outputs_are_program_review_only',
    ])
  })
})
