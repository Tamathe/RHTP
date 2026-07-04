import type { SensitiveCategory } from '../src/types'

export type AdolescentServiceKind =
  | 'phq_gad_screening'
  | 'outpatient_mental_health_counseling'
  | 'sdoh_screening'
  | 'substance_use_assessment'
  | 'sti_care'
  | 'contraception'
  | 'pregnancy_childbirth'
  | 'general_health'

export type AdolescentProviderRole =
  | 'physician'
  | 'qualified_mental_health_professional'
  | 'navigator'
  | 'system'

export type AdolescentConsentStatus =
  | 'minor_self_consent_allowed'
  | 'guardian_consent_allowed'
  | 'guardian_consent_required'
  | 'emergency_allowed'
  | 'legal_review_required'

export type GuardianProxyMode =
  | 'minor_confidential_by_default'
  | 'guardian_proxy_allowed'
  | 'guardian_consent_required_before_collection'
  | 'clinician_review_required'

export interface KentuckyPolicySourceRef {
  id: string
  label: string
  url: string
}

export interface KentuckyAdolescentConsentPolicy {
  jurisdiction: 'KY'
  version: '2026-07-04-local'
  mentalHealthSelfConsentAge: 16
  sourceRefs: KentuckyPolicySourceRef[]
}

export interface EvaluateAdolescentConsentInput {
  patientId: string
  age: number
  serviceKind: AdolescentServiceKind
  providerRole: AdolescentProviderRole
  minorConsent?: boolean
  guardianConsent?: boolean
  unaccompaniedYouth?: boolean
  reasonableAttemptToObtainGuardianConsentOrVerifyStatus?: boolean
  emancipated?: boolean
  marriedOrDivorced?: boolean
  hasBorneChild?: boolean
  emergencyHealthRisk?: boolean
}

export interface AdolescentConsentDecision {
  patientId: string
  serviceKind: AdolescentServiceKind
  status: AdolescentConsentStatus
  reason: string
  sensitiveCategory?: SensitiveCategory
  aiContextSuppressed: boolean
  guardianProxyMode: GuardianProxyMode
  sourceRefIds: string[]
}

export interface EvaluateGuardianProxyDisclosureInput {
  consentDecision: AdolescentConsentDecision
  minorAuthorizesDisclosure?: boolean
  clinicianDeterminesDisclosureBenefitsMinorHealth?: boolean
}

export interface GuardianProxyDisclosureDecision {
  status: 'allowed' | 'blocked'
  reason:
    | 'guardian_personal_representative'
    | 'minor_self_consented_confidential_service'
    | 'minor_authorized_disclosure'
    | 'clinician_health_benefit_override'
    | 'guardian_consent_required_before_collection'
    | 'legal_review_required'
  sourceRefIds: string[]
}

export const KENTUCKY_ADOLESCENT_CONSENT_POLICY: KentuckyAdolescentConsentPolicy = {
  jurisdiction: 'KY',
  version: '2026-07-04-local',
  mentalHealthSelfConsentAge: 16,
  sourceRefs: [
    {
      id: 'KY_KRS_214_185_1',
      label: 'KRS 214.185(1): minor consent for venereal disease, pregnancy, substance use disorder, contraception, pregnancy, and childbirth care',
      url: 'https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=50969',
    },
    {
      id: 'KY_KRS_214_185_2',
      label: 'KRS 214.185(2): physician outpatient mental-health counseling for a child age 16 or older',
      url: 'https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=50969',
    },
    {
      id: 'KY_KRS_214_185_3',
      label: 'KRS 214.185(3): qualified mental-health professional counseling for age-16+ unaccompanied youth',
      url: 'https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=50969',
    },
    {
      id: 'KY_KRS_214_185_4',
      label: 'KRS 214.185(4): emancipated, married/divorced, or childbearing minor consent',
      url: 'https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=50969',
    },
    {
      id: 'KY_KRS_214_185_5',
      label: 'KRS 214.185(5): emergency care without delay when consent delay risks life or health',
      url: 'https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=50969',
    },
    {
      id: 'KY_KRS_214_185_8',
      label: 'KRS 214.185(8): professional may inform parent/guardian when judged beneficial to the minor patient health',
      url: 'https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=50969',
    },
    {
      id: 'KY_KRS_222_441_1',
      label: 'KRS 222.441(1): minor capacity to consent to substance-use-related medical care or counseling',
      url: 'https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=49001',
    },
    {
      id: 'HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION',
      label: 'HHS HIPAA personal-representative guidance for minor-consented confidential services',
      url: 'https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/personal-representatives/index.html',
    },
  ],
}

const mentalHealthServices = new Set<AdolescentServiceKind>([
  'phq_gad_screening',
  'outpatient_mental_health_counseling',
])

function confidentialDecision(
  input: EvaluateAdolescentConsentInput,
  status: AdolescentConsentStatus,
  reason: string,
  sourceRefIds: string[],
  sensitiveCategory: SensitiveCategory,
): AdolescentConsentDecision {
  return {
    patientId: input.patientId,
    serviceKind: input.serviceKind,
    status,
    reason,
    sensitiveCategory,
    aiContextSuppressed: true,
    guardianProxyMode:
      status === 'guardian_consent_required' ? 'guardian_consent_required_before_collection' : 'minor_confidential_by_default',
    sourceRefIds,
  }
}

function guardianDecision(
  input: EvaluateAdolescentConsentInput,
  status: AdolescentConsentStatus,
  reason: string,
  sourceRefIds: string[],
): AdolescentConsentDecision {
  return {
    patientId: input.patientId,
    serviceKind: input.serviceKind,
    status,
    reason,
    aiContextSuppressed: false,
    guardianProxyMode: status === 'legal_review_required' ? 'clinician_review_required' : 'guardian_proxy_allowed',
    sourceRefIds,
  }
}

function hasAdultMinorStatus(input: EvaluateAdolescentConsentInput): boolean {
  return Boolean(input.emancipated || input.marriedOrDivorced || input.hasBorneChild)
}

function mentalHealthConsent(input: EvaluateAdolescentConsentInput): AdolescentConsentDecision {
  if (input.guardianConsent) {
    return guardianDecision(input, 'guardian_consent_allowed', 'guardian_consented_to_minor_mental_health_service', [
      'HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION',
    ])
  }
  if (!input.minorConsent || input.age < KENTUCKY_ADOLESCENT_CONSENT_POLICY.mentalHealthSelfConsentAge) {
    return confidentialDecision(
      input,
      'guardian_consent_required',
      'minor_age_below_kentucky_mental_health_self_consent_floor',
      ['KY_KRS_214_185_2'],
      'adolescent',
    )
  }
  if (input.providerRole === 'physician') {
    return confidentialDecision(
      input,
      'minor_self_consent_allowed',
      'physician_may_provide_outpatient_mental_health_counseling_age_16_plus',
      ['KY_KRS_214_185_2', 'HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION'],
      'adolescent',
    )
  }
  if (input.providerRole === 'qualified_mental_health_professional') {
    if (!input.unaccompaniedYouth || !input.reasonableAttemptToObtainGuardianConsentOrVerifyStatus) {
      return confidentialDecision(
        input,
        'legal_review_required',
        'unaccompanied_youth_verification_required',
        ['KY_KRS_214_185_3', 'KY_KRS_214_185_7'],
        'adolescent',
      )
    }

    return confidentialDecision(
      input,
      'minor_self_consent_allowed',
      'qualified_mental_health_professional_may_serve_verified_unaccompanied_youth_age_16_plus',
      ['KY_KRS_214_185_3', 'KY_KRS_214_185_7', 'HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION'],
      'adolescent',
    )
  }

  return confidentialDecision(
    input,
    'legal_review_required',
    'mental_health_provider_role_not_authorized_for_minor_self_consent',
    ['KY_KRS_214_185_2', 'KY_KRS_214_185_3'],
    'adolescent',
  )
}

function minorSelfConsentCategory(serviceKind: AdolescentServiceKind): SensitiveCategory {
  if (serviceKind === 'substance_use_assessment') return 'part2_sud'
  if (serviceKind === 'sti_care') return 'hiv'
  return 'reproductive'
}

export function evaluateAdolescentConsent(input: EvaluateAdolescentConsentInput): AdolescentConsentDecision {
  if (input.age >= 18) {
    return guardianDecision(input, 'minor_self_consent_allowed', 'adult_patient_self_consent', [])
  }
  if (input.emergencyHealthRisk) {
    return guardianDecision(input, 'emergency_allowed', 'emergency_health_risk_delay_or_denial', ['KY_KRS_214_185_5'])
  }
  if (hasAdultMinorStatus(input)) {
    return guardianDecision(input, 'minor_self_consent_allowed', 'minor_has_adult_status_for_care', [
      'KY_KRS_214_185_4',
      'HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION',
    ])
  }
  if (mentalHealthServices.has(input.serviceKind)) {
    return mentalHealthConsent(input)
  }
  if (input.serviceKind === 'substance_use_assessment') {
    if (!input.minorConsent) {
      return confidentialDecision(
        input,
        'guardian_consent_required',
        'minor_or_guardian_consent_required_for_substance_use_assessment',
        ['KY_KRS_222_441_1'],
        'part2_sud',
      )
    }

    return confidentialDecision(
      input,
      'minor_self_consent_allowed',
      'minor_may_consent_to_substance_use_assessment_or_treatment',
      ['KY_KRS_214_185_1', 'KY_KRS_222_441_1', 'HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION'],
      'part2_sud',
    )
  }
  if (input.serviceKind === 'sti_care' || input.serviceKind === 'contraception' || input.serviceKind === 'pregnancy_childbirth') {
    if (!input.minorConsent) {
      return confidentialDecision(
        input,
        'guardian_consent_required',
        'minor_consent_required_for_confidential_reproductive_or_sti_service',
        ['KY_KRS_214_185_1'],
        minorSelfConsentCategory(input.serviceKind),
      )
    }

    return confidentialDecision(
      input,
      'minor_self_consent_allowed',
      'minor_may_consent_to_reproductive_or_sti_service',
      ['KY_KRS_214_185_1', 'HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION'],
      minorSelfConsentCategory(input.serviceKind),
    )
  }
  if (input.guardianConsent) {
    return guardianDecision(input, 'guardian_consent_allowed', 'guardian_consented_to_general_minor_service', [
      'HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION',
    ])
  }

  return guardianDecision(input, 'guardian_consent_required', 'guardian_consent_required_for_general_minor_service', [])
}

export function evaluateGuardianProxyDisclosure(
  input: EvaluateGuardianProxyDisclosureInput,
): GuardianProxyDisclosureDecision {
  const decision = input.consentDecision
  if (decision.status === 'legal_review_required') {
    return {
      status: 'blocked',
      reason: 'legal_review_required',
      sourceRefIds: decision.sourceRefIds,
    }
  }
  if (decision.guardianProxyMode === 'guardian_consent_required_before_collection') {
    return {
      status: 'blocked',
      reason: 'guardian_consent_required_before_collection',
      sourceRefIds: decision.sourceRefIds,
    }
  }
  if (input.minorAuthorizesDisclosure) {
    return {
      status: 'allowed',
      reason: 'minor_authorized_disclosure',
      sourceRefIds: ['HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION'],
    }
  }
  if (input.clinicianDeterminesDisclosureBenefitsMinorHealth) {
    return {
      status: 'allowed',
      reason: 'clinician_health_benefit_override',
      sourceRefIds: ['KY_KRS_214_185_8'],
    }
  }
  if (decision.guardianProxyMode === 'minor_confidential_by_default') {
    return {
      status: 'blocked',
      reason: 'minor_self_consented_confidential_service',
      sourceRefIds: ['HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION'],
    }
  }

  return {
    status: 'allowed',
    reason: 'guardian_personal_representative',
    sourceRefIds: ['HHS_HIPAA_PERSONAL_REPRESENTATIVE_MINOR_EXCEPTION'],
  }
}
