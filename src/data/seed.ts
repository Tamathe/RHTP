import type {
  Barrier,
  AsyncAccessToken,
  BreakGlassAccess,
  CarePlanTask,
  DataSource,
  GapStatus,
  HubMetric,
  NavigatorTask,
  OpsAlert,
  NavigatorQueueItem,
  Patient,
  PatientConsent,
  PatientIdentity,
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
  gaps: ScreeningGap[]
  barriers: Barrier[]
  carePlanTasks: CarePlanTask[]
  navigatorTasks: NavigatorTask[]
  results: ScreeningResult[]
  referrals: Referral[]
  outreach: OutreachEvent[]
  timeline: TimelineEntry[]
  metrics: HubMetric[]
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
  gaps: [heroGap, ...backgroundGaps],
  barriers: [],
  carePlanTasks: [],
  navigatorTasks: [],
  results: [],
  referrals,
  outreach: [],
  timeline: [{ id: 'tl_hero_0', patientId: HERO_ID, label: 'Gap identified', seq: 0 }],
  metrics,
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
}
