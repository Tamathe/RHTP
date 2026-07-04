import {
  KENTUCKY_ADOLESCENT_CONSENT_POLICY,
  evaluateAdolescentConsent,
  evaluateGuardianProxyDisclosure,
} from './adolescent-consent-policy'

export interface D2AdolescentConsentGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface D2AdolescentConsentGateReport {
  cases: D2AdolescentConsentGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

export function runD2AdolescentConsentGate(): D2AdolescentConsentGateReport {
  const physicianPhq = evaluateAdolescentConsent({
    patientId: 'minor_16',
    age: 16,
    serviceKind: 'phq_gad_screening',
    providerRole: 'physician',
    minorConsent: true,
  })
  const qmhpMissingVerification = evaluateAdolescentConsent({
    patientId: 'minor_16',
    age: 16,
    serviceKind: 'phq_gad_screening',
    providerRole: 'qualified_mental_health_professional',
    minorConsent: true,
    unaccompaniedYouth: true,
    reasonableAttemptToObtainGuardianConsentOrVerifyStatus: false,
  })
  const under16Phq = evaluateAdolescentConsent({
    patientId: 'minor_15',
    age: 15,
    serviceKind: 'phq_gad_screening',
    providerRole: 'physician',
    minorConsent: true,
  })
  const substanceUse = evaluateAdolescentConsent({
    patientId: 'minor_14',
    age: 14,
    serviceKind: 'substance_use_assessment',
    providerRole: 'physician',
    minorConsent: true,
  })
  const blockedProxy = evaluateGuardianProxyDisclosure({ consentDecision: physicianPhq })
  const clinicianOverride = evaluateGuardianProxyDisclosure({
    consentDecision: physicianPhq,
    clinicianDeterminesDisclosureBenefitsMinorHealth: true,
  })
  const sdoh = evaluateAdolescentConsent({
    patientId: 'minor_15',
    age: 15,
    serviceKind: 'sdoh_screening',
    providerRole: 'navigator',
    guardianConsent: true,
  })
  const sdohProxy = evaluateGuardianProxyDisclosure({ consentDecision: sdoh })

  const cases: D2AdolescentConsentGateCase[] = [
    {
      id: 'd2_policy_sources_pinned',
      ok:
        KENTUCKY_ADOLESCENT_CONSENT_POLICY.jurisdiction === 'KY' &&
        KENTUCKY_ADOLESCENT_CONSENT_POLICY.mentalHealthSelfConsentAge === 16 &&
        KENTUCKY_ADOLESCENT_CONSENT_POLICY.sourceRefs.length === 8,
      detail: `sources=${KENTUCKY_ADOLESCENT_CONSENT_POLICY.sourceRefs.length};mentalHealthAge=${KENTUCKY_ADOLESCENT_CONSENT_POLICY.mentalHealthSelfConsentAge}`,
    },
    {
      id: 'd2_physician_phq_gad_age_16_self_consent',
      ok:
        physicianPhq.status === 'minor_self_consent_allowed' &&
        physicianPhq.sensitiveCategory === 'adolescent' &&
        physicianPhq.aiContextSuppressed,
      detail: `${physicianPhq.status};category=${physicianPhq.sensitiveCategory ?? 'none'}`,
    },
    {
      id: 'd2_qmhp_unaccompanied_verification_required',
      ok:
        qmhpMissingVerification.status === 'legal_review_required' &&
        qmhpMissingVerification.reason === 'unaccompanied_youth_verification_required',
      detail: `${qmhpMissingVerification.status};reason=${qmhpMissingVerification.reason}`,
    },
    {
      id: 'd2_under_16_phq_gad_fails_closed',
      ok:
        under16Phq.status === 'guardian_consent_required' &&
        under16Phq.reason === 'minor_age_below_kentucky_mental_health_self_consent_floor' &&
        under16Phq.aiContextSuppressed,
      detail: `${under16Phq.status};reason=${under16Phq.reason}`,
    },
    {
      id: 'd2_sud_minor_self_consent_proxy_suppressed',
      ok:
        substanceUse.status === 'minor_self_consent_allowed' &&
        substanceUse.sensitiveCategory === 'part2_sud' &&
        substanceUse.guardianProxyMode === 'minor_confidential_by_default',
      detail: `${substanceUse.status};proxy=${substanceUse.guardianProxyMode}`,
    },
    {
      id: 'd2_proxy_blocks_minor_consented_confidential_result',
      ok: blockedProxy.status === 'blocked' && blockedProxy.reason === 'minor_self_consented_confidential_service',
      detail: `${blockedProxy.status};reason=${blockedProxy.reason}`,
    },
    {
      id: 'd2_clinician_health_benefit_override_allows_parent_notice',
      ok: clinicianOverride.status === 'allowed' && clinicianOverride.reason === 'clinician_health_benefit_override',
      detail: `${clinicianOverride.status};reason=${clinicianOverride.reason}`,
    },
    {
      id: 'd2_general_sdoh_guardian_proxy_allowed',
      ok:
        sdoh.status === 'guardian_consent_allowed' &&
        !sdoh.aiContextSuppressed &&
        sdohProxy.status === 'allowed' &&
        sdohProxy.reason === 'guardian_personal_representative',
      detail: `${sdoh.status};proxy=${sdohProxy.status}`,
    },
  ]
  const passed = cases.filter((testCase) => testCase.ok).length

  return {
    cases,
    summary: {
      ok: passed === cases.length,
      passed,
      total: cases.length,
    },
  }
}
