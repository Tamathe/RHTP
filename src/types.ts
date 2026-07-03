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
