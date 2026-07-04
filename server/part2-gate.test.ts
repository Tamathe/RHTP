import { describe, expect, it } from 'vitest'
import { runH3Part2Gate } from './part2-gate'

describe('H3 Part 2 gate', () => {
  it('proves facility identity suppression and fail-closed disposition handling', () => {
    const report = runH3Part2Gate()

    expect(report.summary).toEqual({
      ok: true,
      passed: 3,
      total: 3,
      sensitiveTextSuppressed: true,
    })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'sensitive_facility_identity_suppressed',
      'unrecognized_disposition_failed_closed',
      'recognized_non_sensitive_discharge_allowed',
    ])
  })
})
