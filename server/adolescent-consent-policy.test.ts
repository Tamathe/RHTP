import { describe, expect, it } from 'vitest'
import {
  KENTUCKY_ADOLESCENT_CONSENT_POLICY,
  evaluateAdolescentConsent,
  evaluateGuardianProxyDisclosure,
} from './adolescent-consent-policy'

describe('Kentucky adolescent consent policy', () => {
  it('pins D2 to Kentucky minor-consent and HIPAA proxy disclosure sources', () => {
    expect(KENTUCKY_ADOLESCENT_CONSENT_POLICY.sourceRefs.map((source) => source.id)).toEqual([
      'KY_KRS_214_185_1',
      'KY_KRS_214_185_2',
      'KY_KRS_214_185_3',
      'KY_KRS_214_185_4',
      'KY_KRS_214_185_5',
      'KY_KRS_214_185_8',
      'KY_KRS_222_441_1',
      'HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION',
    ])
  })

  it('allows age-16 PHQ/GAD outpatient mental-health screening by a physician on minor consent', () => {
    const decision = evaluateAdolescentConsent({
      patientId: 'minor_16',
      age: 16,
      serviceKind: 'phq_gad_screening',
      providerRole: 'physician',
      minorConsent: true,
    })

    expect(decision).toEqual(
      expect.objectContaining({
        status: 'minor_self_consent_allowed',
        sensitiveCategory: 'adolescent',
        aiContextSuppressed: true,
        guardianProxyMode: 'minor_confidential_by_default',
      }),
    )
    expect(decision.sourceRefIds).toEqual(['KY_KRS_214_185_2', 'HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION'])
  })

  it('requires unaccompanied-youth status and verification attempt for QMHP age-16 mental-health care', () => {
    const missingVerification = evaluateAdolescentConsent({
      patientId: 'minor_16',
      age: 16,
      serviceKind: 'phq_gad_screening',
      providerRole: 'qualified_mental_health_professional',
      minorConsent: true,
      unaccompaniedYouth: true,
      reasonableAttemptToObtainGuardianConsentOrVerifyStatus: false,
    })
    const verified = evaluateAdolescentConsent({
      patientId: 'minor_16',
      age: 16,
      serviceKind: 'phq_gad_screening',
      providerRole: 'qualified_mental_health_professional',
      minorConsent: true,
      unaccompaniedYouth: true,
      reasonableAttemptToObtainGuardianConsentOrVerifyStatus: true,
    })

    expect(missingVerification).toEqual(
      expect.objectContaining({
        status: 'legal_review_required',
        reason: 'unaccompanied_youth_verification_required',
      }),
    )
    expect(verified).toEqual(
      expect.objectContaining({
        status: 'minor_self_consent_allowed',
        sensitiveCategory: 'adolescent',
      }),
    )
    expect(verified.sourceRefIds).toEqual(['KY_KRS_214_185_3', 'KY_KRS_214_185_7', 'HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION'])
  })

  it('fails closed for under-16 PHQ/GAD screening without guardian consent', () => {
    const decision = evaluateAdolescentConsent({
      patientId: 'minor_15',
      age: 15,
      serviceKind: 'phq_gad_screening',
      providerRole: 'physician',
      minorConsent: true,
    })

    expect(decision).toEqual(
      expect.objectContaining({
        status: 'guardian_consent_required',
        reason: 'minor_age_below_kentucky_mental_health_self_consent_floor',
        aiContextSuppressed: true,
        guardianProxyMode: 'guardian_consent_required_before_collection',
      }),
    )
  })

  it('allows minor self-consent for substance-use assessment and keeps proxy suppressed', () => {
    const decision = evaluateAdolescentConsent({
      patientId: 'minor_14',
      age: 14,
      serviceKind: 'substance_use_assessment',
      providerRole: 'physician',
      minorConsent: true,
    })

    expect(decision).toEqual(
      expect.objectContaining({
        status: 'minor_self_consent_allowed',
        sensitiveCategory: 'part2_sud',
        aiContextSuppressed: true,
        guardianProxyMode: 'minor_confidential_by_default',
      }),
    )
    expect(decision.sourceRefIds).toEqual([
      'KY_KRS_214_185_1',
      'KY_KRS_222_441_1',
      'HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION',
    ])
  })

  it('blocks guardian proxy disclosure for minor-consented confidential results unless a clinician records health-benefit override', () => {
    const decision = evaluateAdolescentConsent({
      patientId: 'minor_16',
      age: 16,
      serviceKind: 'phq_gad_screening',
      providerRole: 'physician',
      minorConsent: true,
    })

    expect(evaluateGuardianProxyDisclosure({ consentDecision: decision })).toEqual(
      expect.objectContaining({
        status: 'blocked',
        reason: 'minor_self_consented_confidential_service',
      }),
    )
    expect(
      evaluateGuardianProxyDisclosure({
        consentDecision: decision,
        clinicianDeterminesDisclosureBenefitsMinorHealth: true,
      }),
    ).toEqual(
      expect.objectContaining({
        status: 'allowed',
        reason: 'clinician_health_benefit_override',
      }),
    )
  })

  it('allows general SDOH screening with guardian consent without adolescent-confidential proxy suppression', () => {
    const decision = evaluateAdolescentConsent({
      patientId: 'minor_15',
      age: 15,
      serviceKind: 'sdoh_screening',
      providerRole: 'navigator',
      guardianConsent: true,
    })

    expect(decision).toEqual(
      expect.objectContaining({
        status: 'guardian_consent_allowed',
        aiContextSuppressed: false,
        guardianProxyMode: 'guardian_proxy_allowed',
      }),
    )
    expect(decision.sensitiveCategory).toBeUndefined()
    expect(evaluateGuardianProxyDisclosure({ consentDecision: decision })).toEqual(
      expect.objectContaining({ status: 'allowed', reason: 'guardian_personal_representative' }),
    )
  })
})
