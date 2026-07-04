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

export type SourceKind =
  | 'hie'
  | 'claims'
  | 'site_feed'
  | 'patient_reported'
  | 'navigator_review'
  | 'prototype_seed'

export type SourceConfidence = 'confirmed' | 'probable' | 'patient_reported' | 'needs_review'

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
}

export type ConsentStatus = 'active' | 'missing' | 'revoked'

export interface PatientConsent {
  id: string
  patientId: string
  status: ConsentStatus
  scope: string
  updatedAt: string
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

export interface VoiceTurn {
  id: string
  patientId: string
  speaker: VoiceSpeaker
  text: string
  createdAt: string
  mode: 'voice' | 'text'
  safety: VoiceTurnSafety
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
