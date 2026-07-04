import { describe, expect, it } from 'vitest'
import { runD4PdcGate } from './d4-pdc-gate'

describe('runD4PdcGate', () => {
  it('passes the local D4 PDC diabetes adherence boundary cases', () => {
    const report = runD4PdcGate()

    expect(report.summary).toEqual({ ok: true, passed: 7, total: 7 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'd4_policy_uses_pdc_dr_measurement_contract',
      'd4_drug_grouping_matches_diabetes_all_class',
      'd4_same_drug_overlap_carries_forward',
      'd4_pdc_threshold_passes_at_80_percent',
      'd4_below_threshold_emits_refill_gap',
      'd4_unknown_and_insulin_claims_not_counted',
      'd4_claims_floor_not_device_enhancement',
    ])
  })
})
