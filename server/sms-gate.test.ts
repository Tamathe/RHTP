import { describe, expect, it } from 'vitest'
import { runH5SmsGate } from './sms-gate'

describe('H5 SMS disclosure gate', () => {
  it('proves approved templates, disclosure lint, and category exclusions', () => {
    const report = runH5SmsGate()

    expect(report.summary).toEqual({
      ok: true,
      passed: 5,
      total: 5,
      disclosureLeakageBlocked: true,
    })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'approved_english_template_passes',
      'approved_spanish_template_passes',
      'sensitive_category_blocked',
      'unsafe_slot_blocked',
      'condition_name_lint_blocked',
    ])
  })
})
