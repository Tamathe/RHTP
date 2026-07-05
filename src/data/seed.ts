import type {
  Barrier,
  AsyncAccessToken,
  BreakGlassAccess,
  BillingEvidenceRecord,
  CarePlanTask,
  ClinicianWritebackDraft,
  CoverageNavigationOption,
  DataSource,
  EquityAlarm,
  GapStatus,
  GrantReportPacket,
  HubMetric,
  MetricSnapshotRow,
  NavigatorEnrollmentSession,
  NavigatorTask,
  OpsAlert,
  NavigatorQueueItem,
  Patient,
  PatientConsent,
  PatientIdentity,
  PlainLanguageExplainer,
  PriorityLabel,
  ProtocolEvent,
  RedFlagEvent,
  RuleGapTicket,
  Referral,
  ScreeningGap,
  ScreeningResult,
  ScreeningSite,
  SourceFact,
  ToolCallRecord,
  TranscriptSegment,
  TimelineEntry,
  OutreachEvent,
  VoiceSession,
  VoiceTurn,
} from '../types'

export const HERO_ID = 'pat_ruthann'

export interface SeedState {
  patients: Patient[]
  dataSources: DataSource[]
  sites: ScreeningSite[]
  coverageNavigationOptions: CoverageNavigationOption[]
  plainLanguageExplainers: PlainLanguageExplainer[]
  navigatorEnrollmentSessions: NavigatorEnrollmentSession[]
  gaps: ScreeningGap[]
  barriers: Barrier[]
  carePlanTasks: CarePlanTask[]
  navigatorTasks: NavigatorTask[]
  results: ScreeningResult[]
  referrals: Referral[]
  outreach: OutreachEvent[]
  timeline: TimelineEntry[]
  metrics: HubMetric[]
  metricSnapshots: MetricSnapshotRow[]
  equityAlarms: EquityAlarm[]
  billingEvidenceRecords: BillingEvidenceRecord[]
  grantReportPackets: GrantReportPacket[]
  sourceFacts: SourceFact[]
  patientIdentities: PatientIdentity[]
  consents: PatientConsent[]
  protocolEvents: ProtocolEvent[]
  voiceTurns: VoiceTurn[]
  voiceSessions: VoiceSession[]
  transcriptSegments: TranscriptSegment[]
  toolCalls: ToolCallRecord[]
  redFlagEvents: RedFlagEvent[]
  ruleGapTickets: RuleGapTicket[]
  opsAlerts: OpsAlert[]
  navigatorQueue: NavigatorQueueItem[]
  asyncAccessTokens: AsyncAccessToken[]
  breakGlassAccesses: BreakGlassAccess[]
  clinicianWritebackDrafts: ClinicianWritebackDraft[]
}

const counties = ['Perry', 'Leslie', 'Knott', 'Letcher', 'Breathitt', 'Harlan']

const backgroundStatuses: GapStatus[] = [
  'overdue',
  'overdue',
  'engaged',
  'engaged',
  'scheduled',
  'scheduled',
  'completed',
  'closed',
  'closed',
  'closed',
  'referral',
  'repeat',
]

const priorityFor = (status: GapStatus): PriorityLabel => {
  if (status === 'referral' || status === 'repeat') return 'urgent_follow_up'
  if (status === 'engaged') return 'app_engaged'
  return 'likely_barrier'
}

const names = [
  'Dwayne Collins',
  'Marla Baker',
  'Otis Hensley',
  'Junie Sizemore',
  'Bev Fields',
  'Carl Noble',
  'Rae Combs',
  'Lonnie Turner',
  'Faye Gibson',
  'Hoyt Maggard',
  'Della Ison',
  'Wade Profitt',
]

const a1cValues = ['7.1', '9.2', '6.8', '8.0', '7.6', '10.1', '8.9', '7.3', '6.5', '9.8', '8.2', '7.9']

const backgroundPatients: Patient[] = backgroundStatuses.map((_, index) => ({
  id: `pat_bg_${index + 1}`,
  name: names[index],
  county: counties[index % counties.length],
  language: index % 4 === 1 ? 'es' : 'en',
  accessibilityPrefs: ['read_aloud', 'keyboard_navigation'],
  condition: 'type_2_diabetes',
  a1c: a1cValues[index],
}))

const backgroundGaps: ScreeningGap[] = backgroundStatuses.map((status, index) => ({
  id: `gap_bg_${index + 1}`,
  patientId: `pat_bg_${index + 1}`,
  gapType: 'diabetic_retinopathy',
  status,
  priorityLabel: priorityFor(status),
  lastScreeningDate: '2024-08-01',
}))

const hero: Patient = {
  id: HERO_ID,
  name: 'Ruth Ann Caldwell',
  county: 'Perry',
  language: 'en',
  accessibilityPrefs: ['read_aloud', 'large_text', 'screen_reader', 'high_contrast', 'keyboard_navigation'],
  condition: 'type_2_diabetes',
  a1c: '8.4',
}

const heroGap: ScreeningGap = {
  id: 'gap_hero',
  patientId: HERO_ID,
  gapType: 'diabetic_retinopathy',
  status: 'overdue',
  priorityLabel: 'likely_barrier',
  lastScreeningDate: '2024-12-10',
}

const HERO_SOURCE_FACTS: SourceFact[] = [
  {
    id: 'fact_ruth_diabetes_hie',
    patientId: HERO_ID,
    label: 'Diabetes diagnosis',
    value: 'Type 2 diabetes on imported problem evidence',
    sourceKind: 'hie',
    sourceName: 'Kentucky HIE pilot feed',
    retrievedAt: '2026-07-01',
    effectiveDate: '2024-11-18',
    confidence: 'confirmed',
    patientConfirmed: true,
    navigatorOverridden: false,
    fhirRef: 'Condition/fact_ruth_diabetes_hie',
  },
  {
    id: 'fact_ruth_a1c_hie',
    patientId: HERO_ID,
    label: 'Recent A1C',
    value: '8.4 on 2026-05-12',
    sourceKind: 'hie',
    sourceName: 'Kentucky HIE pilot feed',
    retrievedAt: '2026-07-01',
    effectiveDate: '2026-05-12',
    confidence: 'confirmed',
    patientConfirmed: true,
    navigatorOverridden: false,
    fhirRef: 'Observation/fact_ruth_a1c_hie',
  },
  {
    id: 'fact_ruth_gap_claims',
    patientId: HERO_ID,
    label: 'Retinal screening gap',
    value: 'No retinal screening claim found in the last 12 months',
    sourceKind: 'claims',
    sourceName: 'Claims gap file',
    retrievedAt: '2026-07-01',
    effectiveDate: '2026-06-30',
    confidence: 'probable',
    patientConfirmed: false,
    navigatorOverridden: false,
    fhirRef: 'CoverageEligibilityResponse/fact_ruth_gap_claims',
  },
  {
    id: 'fact_ruth_site_feed',
    patientId: HERO_ID,
    label: 'Screening site availability',
    value: 'FQHC mobile camera has Saturday appointments and ride support',
    sourceKind: 'site_feed',
    sourceName: 'RHTP screening site feed',
    retrievedAt: '2026-07-01',
    effectiveDate: '2026-07-06',
    confidence: 'confirmed',
    patientConfirmed: true,
    navigatorOverridden: false,
  },
  {
    id: 'fact_ruth_discharge_document',
    patientId: HERO_ID,
    label: 'Discharge summary DocumentReference',
    value: 'Synthetic discharge document available for plain-language explanation',
    sourceKind: 'hie',
    sourceName: 'KHIE discharge demo DocumentReference',
    retrievedAt: '2026-07-01',
    effectiveDate: '2026-06-28',
    confidence: 'confirmed',
    patientConfirmed: false,
    navigatorOverridden: false,
    fhirRef: 'DocumentReference/ruth_discharge_demo',
  },
]

const HERO_PATIENT_IDENTITIES: PatientIdentity[] = [
  {
    id: 'identity_ruth_mco',
    patientId: HERO_ID,
    externalSystem: 'kentucky_mco',
    externalId: 'ext_ruth_seed',
    matchMethod: 'deterministic',
    matchConfidence: 1,
    proofingStatus: 'proofed_delegated',
    confirmedByPatient: true,
    createdAt: '2026-07-01T08:00:00',
    updatedAt: '2026-07-01T08:00:00',
  },
  {
    id: 'identity_ruth_navigator_attested',
    patientId: HERO_ID,
    externalSystem: 'rhtp_navigator_enrollment',
    externalId: 'nav_attested_ruth_demo',
    matchMethod: 'deterministic',
    matchConfidence: 1,
    proofingStatus: 'proofed_in_person',
    confirmedByPatient: true,
    createdAt: '2026-07-05T10:15:00',
    updatedAt: '2026-07-05T10:15:00',
  },
]

const HERO_CONSENT: PatientConsent = {
  id: 'consent_ruth_patient_owned',
  patientId: HERO_ID,
  status: 'active',
  scope: 'Use diabetes screening gap, site, barrier, and outreach data for the retinopathy care plan',
  category: 'general',
  version: 'v1',
  updatedAt: '2026-07-01',
}

const HERO_PROTOCOL_EVENTS: ProtocolEvent[] = [
  {
    id: 'proto_ruth_gap_imported',
    patientId: HERO_ID,
    type: 'care_gap_imported',
    label: 'Retinopathy gap imported from trusted sources',
    status: 'identified',
    createdAt: '2026-07-01T08:00:00',
    actor: 'system',
    sourceFactIds: ['fact_ruth_diabetes_hie', 'fact_ruth_gap_claims'],
  },
  {
    id: 'proto_ruth_patient_consented',
    patientId: HERO_ID,
    type: 'patient_consented',
    label: 'Patient consent active for Sandy outreach',
    status: 'patient_contactable',
    createdAt: '2026-07-01T08:05:00',
    actor: 'system',
    sourceFactIds: ['fact_ruth_diabetes_hie', 'fact_ruth_gap_claims', 'fact_ruth_site_feed'],
  },
]

const sites: ScreeningSite[] = [
  {
    id: 'site_fqhc_mobile',
    name: 'Perry County FQHC Mobile Camera',
    type: 'mobile_clinic',
    distanceMiles: 8,
    nextAvailable: 'Saturday 9:00 AM',
    nextAvailableHours: 30,
    rideSupport: true,
    lowCost: true,
  },
  {
    id: 'site_fqhc',
    name: 'Hazard FQHC Eye Program',
    type: 'fqhc',
    distanceMiles: 15,
    nextAvailable: 'Monday 10:00 AM',
    nextAvailableHours: 60,
    rideSupport: false,
    lowCost: true,
  },
  {
    id: 'site_kroger',
    name: 'Community Camera at Kroger',
    type: 'community_camera',
    distanceMiles: 12,
    nextAvailable: 'Friday 4:00 PM',
    nextAvailableHours: 26,
    rideSupport: false,
    lowCost: true,
  },
  {
    id: 'site_eye',
    name: 'Regional Eye Clinic',
    type: 'eye_clinic',
    distanceMiles: 34,
    nextAvailable: 'Tomorrow 2:00 PM',
    nextAvailableHours: 20,
    rideSupport: false,
    lowCost: false,
  },
]

const coverageNavigationOptions: CoverageNavigationOption[] = [
  {
    id: 'coverage_ruth_mobile_fqhc_demo',
    siteId: 'site_fqhc_mobile',
    patientId: HERO_ID,
    payerLabel: 'Kentucky Medicaid MCO demo',
    coverageStatus: 'likely_covered',
    basis: 'fqhc_program',
    estimatedPatientCost: '$0-25 demo estimate',
    rideOption: 'LKLP Community Action Council transportation',
    rideResourceId: 'lklp_transportation_region_13',
    requiresNavigatorConfirmation: true,
    synthetic: true,
    blockers: ['prototype_no_real_coverage_adjudication', 'prototype_no_ride_booking'],
  },
  {
    id: 'coverage_ruth_hazard_fqhc_demo',
    siteId: 'site_fqhc',
    patientId: HERO_ID,
    payerLabel: 'FQHC sliding-fee demo',
    coverageStatus: 'navigator_review_required',
    basis: 'navigator_attested',
    estimatedPatientCost: 'Navigator must confirm demo estimate',
    rideOption: 'Navigator confirms local ride path',
    requiresNavigatorConfirmation: true,
    synthetic: true,
    blockers: ['prototype_no_real_coverage_adjudication', 'prototype_no_ride_booking'],
  },
]

const plainLanguageExplainers: PlainLanguageExplainer[] = [
  {
    id: 'explainer_ruth_discharge_demo',
    patientId: HERO_ID,
    title: 'After-visit explainer',
    sourceDocumentLabel: 'Plain-language discharge summary from a synthetic KHIE document',
    sourceDocumentRef: 'DocumentReference/ruth_discharge_demo',
    sourceFactIds: ['fact_ruth_discharge_document'],
    generatedAt: '2026-07-05T10:00:00',
    readingLevel: 'plain_language',
    synthetic: true,
    patientDataIncluded: false,
    sections: [
      {
        id: 'discharge_what_happened',
        title: 'What happened',
        body:
          'The demo record says a hospital visit ended and a follow-up plan should be reviewed with the care team.',
        citationIds: ['fact_ruth_discharge_document'],
      },
      {
        id: 'discharge_what_to_do_next',
        title: 'What to do next',
        body:
          'Bring the printed instructions, medicine list, and any new symptoms to the next visit so the care team can confirm the plan.',
        citationIds: ['fact_ruth_discharge_document'],
      },
      {
        id: 'discharge_when_to_get_help',
        title: 'When to get help',
        body:
          'If symptoms suddenly get worse, use the urgent contact instructions from the discharge paperwork or call emergency services.',
        citationIds: ['fact_ruth_discharge_document'],
      },
    ],
    questions: [
      {
        id: 'ask_med_changes',
        question: 'Did any medicines change?',
        answer: 'Ask the care team to compare the current medicine list with the discharge paperwork.',
        citationIds: ['fact_ruth_discharge_document'],
      },
      {
        id: 'ask_follow_up',
        question: 'When is follow-up due?',
        answer: 'Ask the care team which appointment needs to happen first and who will help schedule it.',
        citationIds: ['fact_ruth_discharge_document'],
      },
    ],
    safetyBoundary:
      'This is a plain-language guide for a synthetic demo. It does not replace discharge instructions or advice from the care team.',
    blockers: ['prototype_no_real_hie_document', 'prototype_no_medical_advice'],
  },
]

const navigatorEnrollmentSessions: NavigatorEnrollmentSession[] = [
  {
    id: 'enroll_ruth_in_person_demo',
    patientId: HERO_ID,
    identityId: 'identity_ruth_navigator_attested',
    navigatorId: 'nav_dana',
    navigatorName: 'Dana Miller',
    attestationLabel: 'Navigator-attested',
    channel: 'in_person',
    locationLabel: 'Perry County clinic waiting room',
    offlineCapable: true,
    proofingStatus: 'proofed_in_person',
    trustTransferStatus: 'ready_for_patient_login',
    patientLoginHandoff: 'Demo handoff prepares the patient to use their own login after the visit.',
    synthetic: true,
    patientDataIncluded: false,
    steps: [
      {
        id: 'enroll_confirm_presence',
        label: 'Confirm patient is present',
        detail: 'Navigator confirms the patient is physically present for the demo enrollment.',
        status: 'complete',
      },
      {
        id: 'enroll_review_consent',
        label: 'Review consent scope',
        detail: 'Navigator explains the no-PHI demo scope and what production consent would cover.',
        status: 'complete',
      },
      {
        id: 'enroll_offline_capture',
        label: 'Capture offline intake',
        detail: 'The session can be completed before network sync in a rural clinic setting.',
        status: 'complete',
      },
      {
        id: 'enroll_handoff_login',
        label: 'Prepare patient login handoff',
        detail: 'The demo marks the account handoff ready without creating real credentials.',
        status: 'complete',
      },
    ],
    blockers: ['prototype_no_real_identity_proofing', 'prototype_no_account_creation'],
  },
]

export const P3_DATA_SOURCES: DataSource[] = [
  {
    id: 'medicare_blue_button_2',
    name: 'Medicare Blue Button 2.0',
    kind: 'claims',
    trustTier: 2,
    mode: 'poll',
    consentPath: 'patient_oauth',
    status: 'planned',
  },
  {
    id: 'kentucky_mco_patient_access',
    name: 'Kentucky Medicaid MCO Patient Access API',
    kind: 'claims',
    trustTier: 2,
    mode: 'poll',
    consentPath: 'patient_oauth',
    status: 'planned',
  },
  {
    id: 'khie_adt_subscription',
    name: 'KHIE ADT subscription',
    kind: 'hie',
    trustTier: 4,
    mode: 'subscription',
    consentPath: 'participation_agreement',
    status: 'planned',
  },
]

export const P5_DATA_SOURCES: DataSource[] = [
  {
    id: 'healthkit_health_connect',
    name: 'HealthKit and Health Connect',
    kind: 'device',
    trustTier: 3,
    mode: 'subscription',
    consentPath: 'patient_oauth',
    status: 'planned',
  },
  {
    id: 'dexcom_api',
    name: 'Dexcom API',
    kind: 'device',
    trustTier: 3,
    mode: 'poll',
    consentPath: 'patient_oauth',
    status: 'planned',
  },
  {
    id: 'pharmacy_claims_pdc_floor',
    name: 'Pharmacy claims PDC floor',
    kind: 'claims',
    trustTier: 2,
    mode: 'poll',
    consentPath: 'patient_oauth',
    status: 'planned',
  },
]

const metrics: HubMetric[] = [
  {
    id: 'contacted',
    label: 'Overdue patients contacted',
    seed: 9,
    value: 9,
    denominator: 13,
    scope: 'cohort',
  },
  {
    id: 'scheduled',
    label: 'Screenings scheduled',
    seed: 5,
    value: 5,
    denominator: 13,
    scope: 'cohort',
  },
  {
    id: 'completed',
    label: 'Screenings completed',
    seed: 6,
    value: 6,
    denominator: 13,
    scope: 'cohort',
  },
  {
    id: 'gaps_closed',
    label: 'Gaps closed',
    seed: 4,
    value: 4,
    denominator: 13,
    scope: 'cohort',
  },
  {
    id: 'referrals',
    label: 'Referrals completed',
    seed: 1,
    value: 1,
    denominator: 13,
    scope: 'cohort',
  },
  {
    id: 'time_to_treatment',
    label: 'Time to treatment (avg days)',
    seed: 18,
    value: 18,
    denominator: null,
    scope: 'cohort',
  },
]

const metricSnapshots: MetricSnapshotRow[] = [
  {
    id: 'metric_eye_exam_cohort',
    metricId: 'eye_exam',
    packId: 'retinopathy',
    stage: 'gap_closure_rate',
    scope: 'cohort',
    value: 9,
    denominator: 18,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
  },
  {
    id: 'metric_eye_exam_perry',
    metricId: 'eye_exam',
    packId: 'retinopathy',
    stage: 'gap_closure_rate',
    scope: 'county',
    stratum: 'Perry',
    value: 8,
    denominator: 14,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
  },
  {
    id: 'metric_eye_exam_leslie',
    metricId: 'eye_exam',
    packId: 'retinopathy',
    stage: 'gap_closure_rate',
    scope: 'county',
    stratum: 'Leslie',
    value: 7,
    denominator: 12,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
  },
  {
    id: 'metric_eye_exam_harlan_small_cell',
    metricId: 'eye_exam',
    packId: 'retinopathy',
    stage: 'gap_closure_rate',
    scope: 'county',
    stratum: 'Harlan',
    value: 2,
    denominator: 7,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
  },
  {
    id: 'metric_eye_exam_english',
    metricId: 'eye_exam',
    packId: 'retinopathy',
    stage: 'gap_closure_rate',
    scope: 'language',
    stratum: 'English',
    value: 8,
    denominator: 16,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
  },
  {
    id: 'metric_bp_control_cohort',
    metricId: 'bp_control',
    packId: 'hypertension',
    stage: 'outcome_rate',
    scope: 'cohort',
    value: 7,
    denominator: 16,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
  },
  {
    id: 'metric_bp_control_perry',
    metricId: 'bp_control',
    packId: 'hypertension',
    stage: 'outcome_rate',
    scope: 'county',
    stratum: 'Perry',
    value: 6,
    denominator: 12,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
  },
  {
    id: 'metric_bp_control_english',
    metricId: 'bp_control',
    packId: 'hypertension',
    stage: 'outcome_rate',
    scope: 'language',
    stratum: 'English',
    value: 7,
    denominator: 15,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
  },
  {
    id: 'metric_pdc_cohort',
    metricId: 'pdc_diabetes',
    packId: 'pdc_adherence',
    stage: 'outcome_rate',
    scope: 'cohort',
    value: 16,
    denominator: 30,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
    claimsFloorPresent: true,
  },
  {
    id: 'metric_pdc_device_owner',
    metricId: 'pdc_diabetes',
    packId: 'pdc_adherence',
    stage: 'outcome_rate',
    scope: 'device_owner',
    stratum: 'device_owner',
    value: 10,
    denominator: 12,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
    claimsFloorPresent: true,
  },
  {
    id: 'metric_pdc_no_device',
    metricId: 'pdc_diabetes',
    packId: 'pdc_adherence',
    stage: 'outcome_rate',
    scope: 'device_owner',
    stratum: 'no_device_owner',
    value: 6,
    denominator: 18,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
    claimsFloorPresent: true,
  },
  {
    id: 'metric_transition_cohort',
    metricId: 'transitional_care',
    packId: 'transitional_care',
    stage: 'outcome_rate',
    scope: 'cohort',
    value: 9,
    denominator: 15,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
  },
  {
    id: 'metric_transition_perry',
    metricId: 'transitional_care',
    packId: 'transitional_care',
    stage: 'outcome_rate',
    scope: 'county',
    stratum: 'Perry',
    value: 6,
    denominator: 11,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
  },
]

const equityAlarms: EquityAlarm[] = [
  {
    id: 'alarm_pdc_diabetes_device_owner_outcome_rate',
    metricId: 'pdc_diabetes',
    packId: 'pdc_adherence',
    stage: 'outcome_rate',
    stratum: 'device_owner',
    disparityRatio: 0.4,
    threshold: 0.8,
    claimsFloorPresent: true,
    sourceSnapshotIds: ['metric_pdc_device_owner', 'metric_pdc_no_device'],
    programReviewOnly: true,
    synthetic: true,
  },
]

const billingEvidenceRecords: BillingEvidenceRecord[] = [
  {
    id: 'bill_ccm_ruth_july',
    patientId: HERO_ID,
    code: 'ccm',
    label: 'CCM monthly care management time',
    month: '2026-07',
    minutes: 22,
    readingDays: 0,
    documentedArtifactIds: ['audit_nav_call', 'care_plan_update'],
    sourceEventIds: ['proto_ruth_patient_consented'],
    reviewedByNavigator: true,
    synthetic: true,
    claimSubmissionReady: false,
    blockers: ['prototype_no_claim_submission'],
    notes: 'Synthetic navigator time evidence for stakeholder demo.',
  },
  {
    id: 'bill_rpm_ruth_july',
    patientId: HERO_ID,
    code: 'rpm',
    label: 'RPM reading-day evidence',
    month: '2026-07',
    minutes: 0,
    readingDays: 18,
    documentedArtifactIds: ['device_reading_summary'],
    sourceEventIds: ['proto_ruth_gap_imported'],
    reviewedByNavigator: true,
    synthetic: true,
    claimSubmissionReady: false,
    blockers: ['prototype_no_claim_submission'],
    notes: 'Synthetic reading-day count; no real device stream.',
  },
  {
    id: 'bill_apcm_ruth_july',
    patientId: HERO_ID,
    code: 'apcm',
    label: 'APCM longitudinal documentation',
    month: '2026-07',
    minutes: 12,
    readingDays: 0,
    documentedArtifactIds: ['protocol_summary', 'navigator_attestation'],
    sourceEventIds: ['proto_ruth_gap_imported', 'proto_ruth_patient_consented'],
    reviewedByNavigator: true,
    synthetic: true,
    claimSubmissionReady: false,
    blockers: ['prototype_no_claim_submission'],
    notes: 'Synthetic advanced primary-care management documentation bundle.',
  },
  {
    id: 'bill_chw_ruth_july',
    patientId: HERO_ID,
    code: 'chw',
    label: 'CHW navigation support',
    month: '2026-07',
    minutes: 35,
    readingDays: 0,
    documentedArtifactIds: ['resource_connection_note'],
    sourceEventIds: ['proto_ruth_patient_consented'],
    reviewedByNavigator: false,
    synthetic: true,
    claimSubmissionReady: false,
    blockers: ['navigator_review_required', 'prototype_no_claim_submission'],
    notes: 'Synthetic resource-navigation evidence awaiting review.',
  },
]

const grantReportPackets: GrantReportPacket[] = [
  {
    id: 'grant_report_rhtp_july_demo',
    title: 'RHTP stakeholder grant report',
    reportingPeriod: '2026-07',
    cadence: 'monthly',
    recipient: 'RHTP stakeholder review',
    recipientType: 'stakeholder_review',
    generatedAt: '2026-07-05T09:00:00',
    synthetic: true,
    patientDataIncluded: false,
    metricLines: [
      {
        id: 'grant_metric_eye_exam',
        label: 'Retinopathy gap closure',
        metricId: 'eye_exam',
        value: 9,
        denominator: 18,
        sourceSnapshotIds: ['metric_eye_exam_cohort', 'metric_eye_exam_perry', 'metric_eye_exam_leslie'],
        suppressedCount: 1,
      },
      {
        id: 'grant_metric_bp_control',
        label: 'Hypertension control',
        metricId: 'bp_control',
        value: 7,
        denominator: 16,
        sourceSnapshotIds: ['metric_bp_control_cohort', 'metric_bp_control_perry'],
        suppressedCount: 0,
      },
      {
        id: 'grant_metric_pdc',
        label: 'Diabetes medication adherence',
        metricId: 'pdc_diabetes',
        value: 16,
        denominator: 30,
        sourceSnapshotIds: ['metric_pdc_cohort', 'metric_pdc_device_owner', 'metric_pdc_no_device'],
        suppressedCount: 0,
      },
      {
        id: 'grant_metric_transition',
        label: 'Transitional care follow-up',
        metricId: 'transitional_care',
        value: 9,
        denominator: 15,
        sourceSnapshotIds: ['metric_transition_cohort', 'metric_transition_perry'],
        suppressedCount: 0,
      },
    ],
    equityAlarmIds: ['alarm_pdc_diabetes_device_owner_outcome_rate'],
    billingEvidenceIds: ['bill_ccm_ruth_july', 'bill_rpm_ruth_july', 'bill_apcm_ruth_july', 'bill_chw_ruth_july'],
    blockers: ['prototype_no_real_reporting_export', 'no_recipient_delivery'],
  },
]

const referrals: Referral[] = [
  {
    id: 'ref_seed',
    patientId: 'pat_bg_11',
    reason: 'abnormal_result',
    destination: 'Retina specialist, Lexington',
    owner: 'nav_dana',
    status: 'pending',
    daysSinceResult: 5,
  },
]

export const seed: SeedState = {
  patients: [hero, ...backgroundPatients],
  dataSources: [...P3_DATA_SOURCES, ...P5_DATA_SOURCES],
  sites,
  coverageNavigationOptions,
  plainLanguageExplainers,
  navigatorEnrollmentSessions,
  gaps: [heroGap, ...backgroundGaps],
  barriers: [],
  carePlanTasks: [],
  navigatorTasks: [],
  results: [],
  referrals,
  outreach: [],
  timeline: [{ id: 'tl_hero_0', patientId: HERO_ID, label: 'Gap identified', seq: 0 }],
  metrics,
  metricSnapshots,
  equityAlarms,
  billingEvidenceRecords,
  grantReportPackets,
  sourceFacts: HERO_SOURCE_FACTS,
  patientIdentities: HERO_PATIENT_IDENTITIES,
  consents: [HERO_CONSENT],
  protocolEvents: HERO_PROTOCOL_EVENTS,
  voiceTurns: [],
  voiceSessions: [],
  transcriptSegments: [],
  toolCalls: [],
  redFlagEvents: [],
  ruleGapTickets: [],
  opsAlerts: [],
  navigatorQueue: [],
  asyncAccessTokens: [],
  breakGlassAccesses: [],
  clinicianWritebackDrafts: [],
}
