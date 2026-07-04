import { describe, expect, it } from 'vitest'
import { runH4BreakGlassGate } from './h4-break-glass-gate'

describe('runH4BreakGlassGate', () => {
  it('passes the local H4 break-glass gate cases', () => {
    const report = runH4BreakGlassGate()

    expect(report.summary).toEqual({ ok: true, passed: 7, total: 7 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'part2_break_glass_requires_purpose_consent',
      'approved_break_glass_has_ttl',
      'expired_break_glass_read_blocked',
      'post_hoc_review_recorded',
      'adolescent_break_glass_requires_purpose_consent',
      'adolescent_guardian_proxy_blocked',
      'adolescent_break_glass_category_match_required',
    ])
  })
})
