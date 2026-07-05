export type ProtocolPackStatus = 'draft' | 'in_review' | 'published' | 'deprecated' | 'retired'

export type ProtocolPackId =
  | 'retinopathy'
  | 'hypertension'
  | 'pdc_adherence'
  | 'transitional_care'

export type MeasureId =
  | 'eye_exam'
  | 'bp_control'
  | 'pdc_diabetes'
  | 'transitional_care'

export type CareGapType =
  | 'diabetic_retinopathy'
  | 'bp_control'
  | 'med_adherence'
  | 'transitional_care'

export type ObservationType =
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'glucose_cgm'
  | 'glucose_tir_daily'
  | 'weight_daily'
  | 'pharmacy_fill_claim'

export type AdtEventType = 'admit' | 'discharge' | 'transfer' | 'ed_registration'

export type PackToolName =
  | 'answer_education'
  | 'collect_barrier'
  | 'match_site'
  | 'confirm_plan'

export type SafetyAction =
  | 'answer_education'
  | 'collect_barrier'
  | 'match_site'
  | 'confirm_plan'
  | 'summarize_pattern'
  | 'prepare_visit_question'
  | 'route_to_navigator'
  | 'route_988'
  | 'change_medication'
  | 'dose_insulin'
  | 'diagnose'
  | 'autonomous_triage'

export type NavigatorWorkType =
  | 'outreach_followup'
  | 'barrier_resolution'
  | 'reconciliation'
  | 'referral_management'

export interface CohortRules {
  dxCodes?: string[]
  ageRange?: { min?: number; max?: number }
  gapEvidence?: CareGapType[]
  deviceSignals?: string[]
  adtEvents?: string[]
  logic?: 'all' | 'any'
}

export interface EducationModuleRef {
  moduleId: string
  readingLevelGrade: number
  readAloud: boolean
  languages: string[]
  accessibility: {
    wcagTarget: 'WCAG_2_1_AA'
    readAloud: boolean
    largeText: boolean
    screenReader: boolean
    highContrast: boolean
    keyboardNavigation: boolean
    lowLiteracy: boolean
  }
}

export interface InsightRuleRef {
  ruleId: string
  emits: string
  params?: Record<string, number>
}

export interface EscalationMap {
  redFlagRuleIds: string[]
  crisisRoutes: Array<{ trigger: string; action: SafetyAction }>
}

export interface MetricDef {
  metricId: MeasureId
  numerator: string
  denominator: string
  stratifyBy?: Array<'county' | 'language' | 'demographic'>
}

export interface ProtocolPack {
  packId: ProtocolPackId
  version: string
  status: ProtocolPackStatus
  displayName: string
  contentOwner: string
  reviewCadenceDays: number
  measureIds: MeasureId[]
  cohort: CohortRules
  education: EducationModuleRef
  deviceBindings: string[]
  insightRules: InsightRuleRef[]
  conversationTools: string[]
  authorizedSafetyActions: string[]
  escalation: EscalationMap
  navigatorWorkTypes: NavigatorWorkType[]
  outcomeMetrics: MetricDef[]
  redTeamSuiteId: string
  railReuse: {
    stateMachine: 'shared'
    siteMatching: 'shared'
    barrierIntake: 'shared'
    navigatorQueue: 'shared'
    toolGateway: 'shared'
  }
}

export interface ProtocolPackValidationResult {
  ok: boolean
  errors: string[]
}

const P6_PACK_IDS: ProtocolPackId[] = ['hypertension', 'pdc_adherence', 'transitional_care']

const canonicalObservations = new Set<ObservationType>([
  'bp_systolic',
  'bp_diastolic',
  'glucose_cgm',
  'glucose_tir_daily',
  'weight_daily',
  'pharmacy_fill_claim',
])

const canonicalAdtEvents = new Set<AdtEventType>(['admit', 'discharge', 'transfer', 'ed_registration'])
const canonicalTools = new Set<PackToolName>(['answer_education', 'collect_barrier', 'match_site', 'confirm_plan'])
const deniedSafetyActions = new Set<SafetyAction>(['change_medication', 'dose_insulin', 'diagnose', 'autonomous_triage'])
const requiredLanguages = ['en', 'es']
const wcagAaAttestation: EducationModuleRef['accessibility'] = {
  wcagTarget: 'WCAG_2_1_AA',
  readAloud: true,
  largeText: true,
  screenReader: true,
  highContrast: true,
  keyboardNavigation: true,
  lowLiteracy: true,
}

const sharedRailReuse: ProtocolPack['railReuse'] = {
  stateMachine: 'shared',
  siteMatching: 'shared',
  barrierIntake: 'shared',
  navigatorQueue: 'shared',
  toolGateway: 'shared',
}

export const PROTOCOL_PACKS: ProtocolPack[] = [
  {
    packId: 'retinopathy',
    version: '1.0.0',
    status: 'published',
    displayName: 'Diabetic Retinopathy Gap Closure',
    contentOwner: 'RHTP clinical content',
    reviewCadenceDays: 180,
    measureIds: ['eye_exam'],
    cohort: {
      dxCodes: ['E11'],
      gapEvidence: ['diabetic_retinopathy'],
      logic: 'all',
    },
    education: {
      moduleId: 'education.retinopathy_gap.en_es.v1',
      readingLevelGrade: 6,
      readAloud: true,
      languages: ['en', 'es'],
      accessibility: wcagAaAttestation,
    },
    deviceBindings: [],
    insightRules: [
      {
        ruleId: 'insight.retinopathy.gap_due',
        emits: 'care_gap_imported',
      },
    ],
    conversationTools: ['answer_education', 'collect_barrier', 'match_site', 'confirm_plan'],
    authorizedSafetyActions: ['answer_education', 'collect_barrier', 'match_site', 'confirm_plan', 'route_to_navigator'],
    escalation: {
      redFlagRuleIds: ['redflag.eye.symptoms.v1'],
      crisisRoutes: [],
    },
    navigatorWorkTypes: ['barrier_resolution', 'referral_management'],
    outcomeMetrics: [
      {
        metricId: 'eye_exam',
        numerator: 'screening_completed',
        denominator: 'retinopathy_gap_opened',
        stratifyBy: ['county', 'language'],
      },
    ],
    redTeamSuiteId: 'redteam.retinopathy.v1',
    railReuse: sharedRailReuse,
  },
  {
    packId: 'hypertension',
    version: '1.0.0',
    status: 'published',
    displayName: 'Hypertension Monitoring and Support',
    contentOwner: 'RHTP clinical content',
    reviewCadenceDays: 180,
    measureIds: ['bp_control'],
    cohort: {
      dxCodes: ['I10'],
      gapEvidence: ['bp_control'],
      deviceSignals: ['bp_systolic', 'bp_diastolic'],
      logic: 'any',
    },
    education: {
      moduleId: 'education.hypertension_basics.en_es.v1',
      readingLevelGrade: 6,
      readAloud: true,
      languages: ['en', 'es'],
      accessibility: wcagAaAttestation,
    },
    deviceBindings: ['bp_systolic', 'bp_diastolic'],
    insightRules: [
      {
        ruleId: 'insight.bp.uncontrolled',
        emits: 'insight.bp.uncontrolled',
        params: { systolicThreshold: 140, diastolicThreshold: 90 },
      },
    ],
    conversationTools: ['answer_education', 'collect_barrier', 'match_site', 'confirm_plan'],
    authorizedSafetyActions: [
      'answer_education',
      'collect_barrier',
      'match_site',
      'confirm_plan',
      'summarize_pattern',
      'prepare_visit_question',
      'route_to_navigator',
    ],
    escalation: {
      redFlagRuleIds: ['redflag.bp.symptoms.v1'],
      crisisRoutes: [],
    },
    navigatorWorkTypes: ['barrier_resolution', 'outreach_followup'],
    outcomeMetrics: [
      {
        metricId: 'bp_control',
        numerator: 'controlled_bp_reading_confirmed',
        denominator: 'hypertension_pack_active',
        stratifyBy: ['county', 'language'],
      },
    ],
    redTeamSuiteId: 'redteam.hypertension.v1',
    railReuse: sharedRailReuse,
  },
  {
    packId: 'pdc_adherence',
    version: '1.0.0',
    status: 'published',
    displayName: 'Diabetes Medication Adherence',
    contentOwner: 'RHTP clinical content',
    reviewCadenceDays: 180,
    measureIds: ['pdc_diabetes'],
    cohort: {
      dxCodes: ['E11'],
      gapEvidence: ['med_adherence'],
      deviceSignals: ['pharmacy_fill_claim'],
      logic: 'all',
    },
    education: {
      moduleId: 'education.med_adherence.en_es.v1',
      readingLevelGrade: 6,
      readAloud: true,
      languages: ['en', 'es'],
      accessibility: wcagAaAttestation,
    },
    deviceBindings: ['pharmacy_fill_claim'],
    insightRules: [
      {
        ruleId: 'insight.med.refill_gap',
        emits: 'insight.med.refill_gap',
        params: { pdcThresholdPercent: 80 },
      },
    ],
    conversationTools: ['answer_education', 'collect_barrier', 'match_site', 'confirm_plan'],
    authorizedSafetyActions: ['answer_education', 'collect_barrier', 'match_site', 'confirm_plan', 'route_to_navigator'],
    escalation: {
      redFlagRuleIds: ['redflag.medication.access.v1'],
      crisisRoutes: [],
    },
    navigatorWorkTypes: ['barrier_resolution', 'reconciliation'],
    outcomeMetrics: [
      {
        metricId: 'pdc_diabetes',
        numerator: 'pdc_diabetes_at_or_above_80',
        denominator: 'pdc_diabetes_eligible',
        stratifyBy: ['county', 'language'],
      },
    ],
    redTeamSuiteId: 'redteam.pdc_adherence.v1',
    railReuse: sharedRailReuse,
  },
  {
    packId: 'transitional_care',
    version: '1.0.0',
    status: 'published',
    displayName: 'Post-Discharge Transitional Care',
    contentOwner: 'RHTP clinical content',
    reviewCadenceDays: 180,
    measureIds: ['transitional_care'],
    cohort: {
      adtEvents: ['discharge'],
      logic: 'all',
    },
    education: {
      moduleId: 'education.transition_followup.en_es.v1',
      readingLevelGrade: 6,
      readAloud: true,
      languages: ['en', 'es'],
      accessibility: wcagAaAttestation,
    },
    deviceBindings: [],
    insightRules: [
      {
        ruleId: 'insight.transition.discharge_followup_due',
        emits: 'insight.transition.discharge_followup_due',
        params: { followupWindowDays: 7 },
      },
    ],
    conversationTools: ['answer_education', 'collect_barrier', 'match_site', 'confirm_plan'],
    authorizedSafetyActions: ['answer_education', 'collect_barrier', 'match_site', 'confirm_plan', 'route_to_navigator'],
    escalation: {
      redFlagRuleIds: ['redflag.transition.symptoms.v1'],
      crisisRoutes: [],
    },
    navigatorWorkTypes: ['outreach_followup', 'barrier_resolution'],
    outcomeMetrics: [
      {
        metricId: 'transitional_care',
        numerator: 'followup_completed_within_7_days',
        denominator: 'discharge_followup_due',
        stratifyBy: ['county', 'language'],
      },
    ],
    redTeamSuiteId: 'redteam.transitional_care.v1',
    railReuse: sharedRailReuse,
  },
]

function hasAllRequiredLanguages(languages: string[]): boolean {
  return requiredLanguages.every((language) => languages.includes(language))
}

function validateSharedRails(pack: ProtocolPack, errors: string[]): void {
  for (const [rail, mode] of Object.entries(pack.railReuse)) {
    if (mode !== 'shared') {
      errors.push(`${pack.packId} does not reuse shared ${rail}`)
    }
  }
}

export function validateProtocolPack(pack: ProtocolPack): ProtocolPackValidationResult {
  const errors: string[] = []

  for (const observation of [...pack.deviceBindings, ...(pack.cohort.deviceSignals ?? [])]) {
    if (!canonicalObservations.has(observation as ObservationType)) {
      errors.push(`${pack.packId} uses non-canonical observation ${observation}`)
    }
  }

  for (const adtEvent of pack.cohort.adtEvents ?? []) {
    if (!canonicalAdtEvents.has(adtEvent as AdtEventType)) {
      errors.push(`${pack.packId} uses non-canonical ADT event ${adtEvent}`)
    }
  }

  for (const tool of pack.conversationTools) {
    if (!canonicalTools.has(tool as PackToolName)) {
      errors.push(`${pack.packId} authorizes unknown tool ${tool}`)
    }
  }

  for (const safetyAction of pack.authorizedSafetyActions) {
    if (deniedSafetyActions.has(safetyAction as SafetyAction)) {
      errors.push(`${pack.packId} authorizes denied safety action ${safetyAction}`)
    }
  }

  if (pack.insightRules.length === 0) {
    errors.push(`${pack.packId} has no insight rules`)
  }

  if (pack.outcomeMetrics.length === 0) {
    errors.push(`${pack.packId} has no outcome metrics`)
  }

  if (pack.redTeamSuiteId.trim().length === 0) {
    errors.push(`${pack.packId} has no red-team suite`)
  }

  if (!hasAllRequiredLanguages(pack.education.languages)) {
    errors.push(`${pack.packId} does not include required en/es education languages`)
  }

  if (pack.education.readingLevelGrade > 6) {
    errors.push(`${pack.packId} education is above sixth-grade reading level`)
  }

  if (pack.education.accessibility.wcagTarget !== 'WCAG_2_1_AA') {
    errors.push(`${pack.packId} education is missing WCAG 2.1 AA attestation`)
  }

  for (const [key, value] of Object.entries(pack.education.accessibility)) {
    if (key !== 'wcagTarget' && value !== true) {
      errors.push(`${pack.packId} education accessibility ${key} is not attested`)
    }
  }

  validateSharedRails(pack, errors)

  return {
    ok: errors.length === 0,
    errors,
  }
}

export function validateProtocolPackRegistry(packs: ProtocolPack[]): ProtocolPackValidationResult {
  const errors = packs.flatMap((pack) => validateProtocolPack(pack).errors)
  const ids = new Set(packs.map((pack) => pack.packId))

  for (const packId of ['retinopathy', ...P6_PACK_IDS]) {
    if (!ids.has(packId as ProtocolPackId)) {
      errors.push(`registry is missing ${packId}`)
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

export function p6PackIds(): ProtocolPackId[] {
  return PROTOCOL_PACKS.filter((pack) => P6_PACK_IDS.includes(pack.packId)).map((pack) => pack.packId)
}
