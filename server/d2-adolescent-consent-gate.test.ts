import { describe, expect, it } from 'vitest'
import { runD2AdolescentConsentGate } from './d2-adolescent-consent-gate'

describe('runD2AdolescentConsentGate', () => {
  it('passes the local D2 adolescent consent and proxy disclosure boundary cases', () => {
    const report = runD2AdolescentConsentGate()

    expect(report.summary).toEqual({ ok: true, passed: 8, total: 8 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'd2_policy_sources_pinned',
      'd2_physician_phq_gad_age_16_self_consent',
      'd2_qmhp_unaccompanied_verification_required',
      'd2_under_16_phq_gad_fails_closed',
      'd2_sud_minor_self_consent_proxy_suppressed',
      'd2_proxy_blocks_minor_consented_confidential_result',
      'd2_clinician_health_benefit_override_allows_parent_notice',
      'd2_general_sdoh_guardian_proxy_allowed',
    ])
  })
})
