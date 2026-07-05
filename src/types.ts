export type GapStatus =
  | 'overdue'
  | 'engaged'
  | 'scheduled'
  | 'completed'
  | 'closed'
  | 'referral'
  | 'repeat'

export type PriorityLabel =
  | 'urgent_follow_up'
  | 'likely_barrier'
  | 'app_engaged'
  | 'navigator_needed'

export type ResultOutcome = 'normal' | 'abnormal' | 'ungradable'

export type BarrierType =
  | 'transportation'
  | 'cost'
  | 'after_hours'
  | 'not_ready'
  | 'already_completed'

export interface Patient {
  id: string
  name: string
  county: string
  condition: string
  a1c: string
}

export interface ScreeningSite {
  id: string
  name: string
  type: 'fqhc' | 'mobile_clinic' | 'community_camera' | 'eye_clinic'
  distanceMiles: number
  nextAvailable: string
  nextAvailableHours: number
  rideSupport: boolean
  lowCost: boolean
}

export type CoverageStatus = 'likely_covered' | 'navigator_review_required' | 'unknown'
export type CoverageBasis =
  | 'medicaid_mco_benefit'
  | 'fqhc_program'
  | 'community_camera_program'
  | 'navigator_attested'

export interface CoverageNavigationOption {
  id: string
  siteId: string
  patientId: string
  payerLabel: string
  coverageStatus: CoverageStatus
  basis: CoverageBasis
  estimatedPatientCost: string
  rideOption: string
  rideResourceId?: string
  requiresNavigatorConfirmation: boolean
  synthetic: boolean
  blockers: string[]
}

export interface PlainLanguageExplainerSection {
  id: string
  title: string
  body: string
  citationIds: string[]
}

export interface PlainLanguageExplainerQuestion {
  id: string
  question: string
  answer: string
  citationIds: string[]
}

export interface PlainLanguageExplainer {
  id: string
  patientId: string
  title: string
  sourceDocumentLabel: string
  sourceDocumentRef: string
  sourceFactIds: string[]
  generatedAt: string
  readingLevel: 'plain_language'
  synthetic: boolean
  patientDataIncluded: false
  sections: PlainLanguageExplainerSection[]
  questions: PlainLanguageExplainerQuestion[]
  safetyBoundary: string
  blockers: string[]
}

export interface NavigatorEnrollmentStep {
  id: string
  label: string
  detail: string
  status: 'complete' | 'blocked'
}

export interface NavigatorEnrollmentSession {
  id: string
  patientId: string
  identityId: string
  navigatorId: string
  navigatorName: string
  attestationLabel: 'Navigator-attested'
  channel: 'in_person'
  locationLabel: string
  offlineCapable: boolean
  proofingStatus: IdentityProofingStatus
  trustTransferStatus: 'ready_for_patient_login' | 'blocked'
  patientLoginHandoff: string
  synthetic: boolean
  patientDataIncluded: false
  steps: NavigatorEnrollmentStep[]
  blockers: string[]
}

export interface ScreeningGap {
  id: string
  patientId: string
  gapType: 'diabetic_retinopathy'
  status: GapStatus
  priorityLabel: PriorityLabel
  lastScreeningDate: string
}

export interface Barrier {
  id: string
  patientId: string
  type: BarrierType
  detail: string
  reportedVia: string
}

export interface CarePlanTask {
  id: string
  patientId: string
  siteId: string
  step: string
  when: string
}

export interface NavigatorTask {
  id: string
  patientId: string
  type: string
  status: 'open' | 'done'
  owner: string
  note: string
}

export interface ScreeningResult {
  id: string
  gapId: string
  outcome: ResultOutcome
  gradable: boolean
  capturedAt: string
}

export interface Referral {
  id: string
  patientId: string
  reason: string
  destination: string
  owner: string
  status: 'pending' | 'scheduled' | 'completed'
  daysSinceResult: number
}

export interface OutreachEvent {
  id: string
  patientId: string
  kind: 'assistant_question'
  detail: string
  surface: string
}

export interface TimelineEntry {
  id: string
  patientId: string
  label: string
  seq: number
}

export interface HubMetric {
  id: string
  label: string
  seed: number
  value: number
  denominator: number | null
  scope: 'cohort'
}

export type MetricSnapshotScope = 'cohort' | 'county' | 'language' | 'demographic' | 'device_owner'
export type EquityMetricStage =
  | 'insight_rate'
  | 'outreach_rate'
  | 'engagement_rate'
  | 'outcome_rate'
  | 'gap_closure_rate'

export interface MetricSnapshotRow {
  id: string
  metricId: string
  packId: string
  stage: EquityMetricStage
  scope: MetricSnapshotScope
  stratum?: string
  value: number
  denominator: number
  capturedAt: string
  synthetic: boolean
  suppressed?: boolean
  suppressionReason?: string
  claimsFloorPresent?: boolean
}

export interface EquityAlarm {
  id: string
  metricId: string
  packId: string
  stage: EquityMetricStage
  stratum: MetricSnapshotScope
  disparityRatio: number
  threshold: number
  claimsFloorPresent: boolean
  sourceSnapshotIds: string[]
  programReviewOnly: boolean
  synthetic: boolean
}

export type BillingEvidenceCode = 'ccm' | 'rpm' | 'apcm' | 'chw'

export interface BillingEvidenceRecord {
  id: string
  patientId: string
  code: BillingEvidenceCode
  label: string
  month: string
  minutes: number
  readingDays: number
  documentedArtifactIds: string[]
  sourceEventIds: string[]
  reviewedByNavigator: boolean
  synthetic: boolean
  claimSubmissionReady: boolean
  blockers: string[]
  notes: string
}

export type GrantReportCadence = 'monthly' | 'quarterly'
export type GrantReportRecipientType = 'stakeholder_review' | 'grant_funder' | 'mco_partner'

export interface GrantReportMetricLine {
  id: string
  label: string
  metricId: string
  value: number
  denominator: number
  sourceSnapshotIds: string[]
  suppressedCount: number
}

export interface GrantReportPacket {
  id: string
  title: string
  reportingPeriod: string
  cadence: GrantReportCadence
  recipient: string
  recipientType: GrantReportRecipientType
  generatedAt: string
  synthetic: boolean
  patientDataIncluded: false
  metricLines: GrantReportMetricLine[]
  equityAlarmIds: string[]
  billingEvidenceIds: string[]
  blockers: string[]
}

export type SourceKind =
  | 'hie'
  | 'claims'
  | 'device'
  | 'site_feed'
  | 'patient_reported'
  | 'navigator_review'
  | 'prototype_seed'

export type SourceConfidence = 'confirmed' | 'probable' | 'patient_reported' | 'needs_review'
export type SensitiveCategory = 'part2_sud' | 'adolescent' | 'behavioral' | 'reproductive' | 'hiv'

export interface DataSource {
  id: string
  name: string
  kind: SourceKind
  trustTier: number
  mode: 'poll' | 'subscription' | 'manual'
  consentPath: 'patient_oauth' | 'participation_agreement' | 'public_directory' | 'navigator_attested'
  status: 'planned' | 'active' | 'blocked'
}

export type IdentityProofingStatus = 'unproofed' | 'proofed_in_person' | 'proofed_remote' | 'proofed_delegated'
export type PatientIdentityMatchMethod = 'deterministic' | 'probabilistic'

export interface PatientIdentity {
  id: string
  patientId: string
  externalSystem: string
  externalId: string
  matchMethod: PatientIdentityMatchMethod
  matchConfidence: number
  proofingStatus: IdentityProofingStatus
  confirmedByPatient: boolean
  createdAt: string
  updatedAt: string
}

export interface SourceFact {
  id: string
  patientId: string
  label: string
  value: string
  sourceKind: SourceKind
  sourceName: string
  retrievedAt: string
  effectiveDate: string
  confidence: SourceConfidence
  patientConfirmed: boolean
  navigatorOverridden: boolean
  fhirRef?: string
  sensitiveCategory?: SensitiveCategory
  aiContextSuppressed?: boolean
}

export type ConsentStatus = 'active' | 'missing' | 'revoked'
export type ConsentCategory = 'general' | 'part2_sud' | 'adolescent'

export interface PatientConsent {
  id: string
  patientId: string
  status: ConsentStatus
  scope: string
  updatedAt: string
  category?: ConsentCategory
  version?: string
}

export type ProtocolStatus =
  | 'identified'
  | 'patient_contactable'
  | 'explained'
  | 'barrier_collected'
  | 'site_matched'
  | 'scheduled'
  | 'completed'
  | 'normal_closed'
  | 'abnormal_referral_needed'
  | 'repeat_needed'
  | 'navigator_review'
  | 'closed_by_reconciliation'

export type ProtocolEventType =
  | 'care_gap_imported'
  | 'patient_consented'
  | 'sandy_explained_gap'
  | 'question_answered'
  | 'barrier_reported'
  | 'sdoh_resource_requested'
  | 'red_flag_reported'
  | 'site_matched'
  | 'appointment_confirmed'
  | 'already_completed_claimed'
  | 'result_imported'
  | 'navigator_reviewed'
  | 'referral_scheduled'
  | 'repeat_scheduled'

export type ProtocolActor = 'sandy' | 'patient' | 'navigator' | 'system'
export type PackId = string

export type AsyncAccessTokenStatus = 'active' | 'revoked'

export interface AsyncAccessToken {
  id: string
  patientId: string
  packIds: PackId[]
  purpose: string
  tokenHash: string
  status: AsyncAccessTokenStatus
  issuedAt: string
  expiresAt: string
  revokedAt?: string
  revokedReason?: string
}

export type BreakGlassAccessStatus = 'requested' | 'active' | 'expired' | 'denied' | 'reviewed'
export type BreakGlassReviewOutcome = 'confirmed_appropriate' | 'inappropriate_access'
export type BreakGlassRequesterKind = 'navigator' | 'guardian_proxy' | 'privacy_officer'

export interface BreakGlassAccess {
  id: string
  patientId: string
  category: SensitiveCategory
  purpose: string
  requestedBy: string
  requesterKind?: BreakGlassRequesterKind
  approvedBy?: string
  status: BreakGlassAccessStatus
  issuedAt: string
  expiresAt?: string
  reviewedAt?: string
  reviewer?: string
  reviewOutcome?: BreakGlassReviewOutcome
  reviewRequired: boolean
  sourceFactIds: string[]
}

export interface ProtocolEvent {
  id: string
  patientId: string
  type: ProtocolEventType
  label: string
  status: ProtocolStatus
  createdAt: string
  actor: ProtocolActor
  sourceFactIds: string[]
}

export type VoiceSpeaker = 'patient' | 'sandy'
export type VoiceTurnSafety = 'normal' | 'fallback' | 'red_flag'
export type SpeechActLabel =
  | 'education_question'
  | 'barrier_report'
  | 'site_preference'
  | 'red_flag'
  | 'off_protocol'
  | 'unknown'

export type ToolName = 'answer_education' | 'collect_barrier' | 'match_site' | 'confirm_plan'
export type ToolCallDecision = 'allowed' | 'blocked' | 'failed'
export type ToolRefusalReason =
  | 'invalid_input'
  | 'patient_not_found'
  | 'voice_session_not_found'
  | 'pack_not_authorized'
  | 'consent_missing'
  | 'red_flag_lock'

export interface ToolCallRecord {
  id: string
  voiceSessionId?: string
  patientId: string
  protocolInstanceId: string
  packId: PackId
  toolName: string
  input: Record<string, unknown>
  decision: ToolCallDecision
  emittedEventId?: string
  modelId: string
  modelVersion: string
  createdAt: string
}

export type ToolResult =
  | {
      ok: true
      toolName: string
      emittedEventId: string
      message: string
      payload?: Record<string, unknown>
    }
  | {
      ok: false
      toolName: string
      refusalReason: ToolRefusalReason
      message: string
    }

export interface VoiceTurn {
  id: string
  patientId: string
  speaker: VoiceSpeaker
  text: string
  createdAt: string
  mode: 'voice' | 'text'
  safety: VoiceTurnSafety
}

export interface VoiceSession {
  id: string
  patientId: string
  protocolInstanceId: string
  packId: PackId
  channel: 'voice'
  realtimeModelId: string
  safetyIdentifier: string
  status: 'active' | 'ended' | 'blocked_red_flag'
  startedAt: string
  endedAt?: string
}

export interface TranscriptSegment {
  id: string
  voiceSessionId: string
  speaker: VoiceSpeaker
  text: string
  createdAt: string
  safety: VoiceTurnSafety
  classifierLabels: SpeechActLabel[]
}

export interface RedFlagEvent {
  id: string
  patientId: string
  symptom: string
  action: string
  createdAt: string
  status: 'open' | 'reviewed'
}

export interface RuleGapTicket {
  id: string
  patientId: string
  text: string
  source: 'model_backstop'
  modelBackstopLabel: string
  status: 'open' | 'resolved'
  createdAt: string
  sourceEventIds: string[]
}

export type ClinicianWritebackStatus = 'draft' | 'navigator_signed' | 'clinician_approved' | 'persisted'

export interface ClinicianWritebackDraft {
  id: string
  patientId: string
  sourceSummaryId: string
  navigatorAttesterId?: string
  clinicianApproverId?: string
  status: ClinicianWritebackStatus
  fhirResourceType: 'DocumentReference'
  provenance: {
    author: 'rhtp_program'
    attester: string
  }
  containsProhibited: boolean
  body: string
  createdAt: string
  persistedAt?: string
  emrSystem?: string
}

export type OpsAlertType = 'model_backstop_degraded' | 'real_voice_config_blocked' | 'real_voice_provider_error'
export type OpsAlertSeverity = 'warning' | 'critical'
export type OpsAlertStatus = 'open' | 'resolved'

export interface OpsAlert {
  id: string
  type: OpsAlertType
  severity: OpsAlertSeverity
  status: OpsAlertStatus
  message: string
  detail: string
  createdAt: string
}

export type NavigatorQueueReason =
  | 'transportation_barrier'
  | 'cost_barrier'
  | 'after_hours_needed'
  | 'patient_not_ready'
  | 'already_completed_needs_reconciliation'
  | 'red_flag_symptom'
  | 'sdoh_resource_connection'
  | 'abnormal_result_referral'
  | 'ungradable_repeat_needed'
  | 'nonresponse'
  | 'identity_match_review'
  | 'segmented_data_review'
  | 'low_confidence_identity_or_gap_match'

export type NavigatorQueuePriority = 'routine' | 'soon' | 'urgent'

export interface NavigatorQueueItem {
  id: string
  patientId: string
  reason: NavigatorQueueReason
  priority: NavigatorQueuePriority
  summary: string
  suggestedAction: string
  status: 'open' | 'done'
  createdAt: string
  sourceEventIds: string[]
}
