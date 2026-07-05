import { describe, expect, it } from 'vitest'

import { runAccessibilityGate } from './accessibility-gate'

describe('accessibility gate', () => {
  it('passes the local no-PHI accessibility acceptance checks', () => {
    const report = runAccessibilityGate()

    expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'demo_patients_declare_accessibility_preferences',
      'education_modules_have_wcag_aa_attestations',
      'patient_preferences_are_satisfied_by_pack_content',
      'phone_profile_exposes_rendering_affordances',
      'accessibility_residual_is_local_control_verified',
    ])
  })
})
