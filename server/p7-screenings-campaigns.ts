import { screenPatientMessage } from '../src/lib/safety'
import type { NavigatorQueueItem, NavigatorQueuePriority, NavigatorQueueReason } from '../src/types'

export type ScreeningInstrument = 'phq2' | 'phq9' | 'gad7'
export type PhqSeverity = 'none_minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe'
export type GadSeverity = 'minimal' | 'mild' | 'moderate' | 'severe'
export type ScreeningSeverity = PhqSeverity | GadSeverity
export type SdohDomain =
  | 'housing'
  | 'food'
  | 'transportation'
  | 'utilities'
  | 'financial_strain'
  | 'social_isolation'
  | 'interpersonal_safety'
  | 'employment'

export type SdohSource = 'prapare_intake' | 'passive_barrier_tag'
export type OutboundChannel = 'sms' | 'push' | 'in_app'
export type CampaignBarrier = 'transportation' | 'cost' | 'after_hours'

export interface ScreeningItem {
  instrument: ScreeningInstrument
  itemNo: number
  text: string
  isCrisisItem: boolean
}

export interface Phq2Score {
  instrument: 'phq2'
  totalScore: number
  positive: boolean
  nextInstrument: 'phq9' | null
}

export interface Phq9Score {
  instrument: 'phq9'
  totalScore: number
  severity: PhqSeverity
  crisisItemPositive: boolean
}

export interface Gad7Score {
  instrument: 'gad7'
  totalScore: number
  severity: GadSeverity
}

export type ScreeningRoute =
  | {
      eventType: 'crisis_route_triggered'
      state: 'navigator_review'
      navigatorReason: 'crisis_escalation'
      navigatorPriority: 'urgent'
      action: 'route_988'
      continueInstrument: false
      totalScore: number
      severity: ScreeningSeverity
    }
  | {
      eventType: 'screening_scored'
      state: 'closed_resolved' | 'signal_collected' | 'referral_needed'
      navigatorReason: 'positive_screen_followup' | null
      navigatorPriority: NavigatorQueuePriority | null
      action: 'none' | 'navigator_followup'
      continueInstrument: false
      totalScore: number
      severity: ScreeningSeverity
    }

export interface RouteScreeningInput {
  instrument: 'phq9' | 'gad7'
  answers: number[]
  freeText?: string
  adversarialModelSeverity?: ScreeningSeverity
}

export interface SdohFlag {
  id: string
  patientId: string
  domain: SdohDomain
  zCode: string
  source: SdohSource
  confidence: 'patient_reported' | 'needs_review'
  status: 'raised'
  sourceFactIds: string[]
  barrierId?: string
  navigatorPriority: NavigatorQueuePriority
  canAutoRefer: boolean
}

export interface RaiseSdohFlagInput {
  patientId: string
  domain: SdohDomain
  source: SdohSource
  sourceFactIds: string[]
  barrierId?: string
}

export interface CampaignPatientSnapshot {
  id: string
  age: number
  conditions: string[]
  immunizations: string[]
}

export interface CampaignCohortInput {
  packId: 'flu_campaign'
  patients: CampaignPatientSnapshot[]
  season: string
}

export interface CampaignRun {
  id: string
  packId: 'flu_campaign'
  packVersion: '1.0.0'
  cohortSnapshotAt: string
  eligiblePatientIds: string[]
  enrolledCount: number
  pacingProfile: {
    perDayCap: number
    startAt: string
    channelLadder: Array<'in_app' | 'sms' | 'offer_human'>
  }
  status: 'draft' | 'running' | 'paused' | 'completed'
}

export const screeningItems: Record<ScreeningInstrument, ScreeningItem[]> = {
  phq2: [
    {
      instrument: 'phq2',
      itemNo: 1,
      text: 'Little interest or pleasure in doing things',
      isCrisisItem: false,
    },
    {
      instrument: 'phq2',
      itemNo: 2,
      text: 'Feeling down, depressed, or hopeless',
      isCrisisItem: false,
    },
  ],
  phq9: [
    {
      instrument: 'phq9',
      itemNo: 1,
      text: 'Little interest or pleasure in doing things',
      isCrisisItem: false,
    },
    {
      instrument: 'phq9',
      itemNo: 2,
      text: 'Feeling down, depressed, or hopeless',
      isCrisisItem: false,
    },
    {
      instrument: 'phq9',
      itemNo: 3,
      text: 'Trouble falling or staying asleep, or sleeping too much',
      isCrisisItem: false,
    },
    {
      instrument: 'phq9',
      itemNo: 4,
      text: 'Feeling tired or having little energy',
      isCrisisItem: false,
    },
    {
      instrument: 'phq9',
      itemNo: 5,
      text: 'Poor appetite or overeating',
      isCrisisItem: false,
    },
    {
      instrument: 'phq9',
      itemNo: 6,
      text: 'Feeling bad about yourself - or that you are a failure or have let yourself or your family down',
      isCrisisItem: false,
    },
    {
      instrument: 'phq9',
      itemNo: 7,
      text: 'Trouble concentrating on things, such as reading the newspaper or watching television',
      isCrisisItem: false,
    },
    {
      instrument: 'phq9',
      itemNo: 8,
      text: 'Moving or speaking so slowly that other people could have noticed, or the opposite - being so fidgety or restless that you have been moving around a lot more than usual',
      isCrisisItem: false,
    },
    {
      instrument: 'phq9',
      itemNo: 9,
      text: 'Thoughts that you would be better off dead, or of hurting yourself in some way',
      isCrisisItem: true,
    },
  ],
  gad7: [
    {
      instrument: 'gad7',
      itemNo: 1,
      text: 'Feeling nervous, anxious, or on edge',
      isCrisisItem: false,
    },
    {
      instrument: 'gad7',
      itemNo: 2,
      text: 'Not being able to stop or control worrying',
      isCrisisItem: false,
    },
    {
      instrument: 'gad7',
      itemNo: 3,
      text: 'Worrying too much about different things',
      isCrisisItem: false,
    },
    {
      instrument: 'gad7',
      itemNo: 4,
      text: 'Trouble relaxing',
      isCrisisItem: false,
    },
    {
      instrument: 'gad7',
      itemNo: 5,
      text: 'Being so restless that it is hard to sit still',
      isCrisisItem: false,
    },
    {
      instrument: 'gad7',
      itemNo: 6,
      text: 'Becoming easily annoyed or irritable',
      isCrisisItem: false,
    },
    {
      instrument: 'gad7',
      itemNo: 7,
      text: 'Feeling afraid as if something awful might happen',
      isCrisisItem: false,
    },
  ],
}

const sdohZCodes: Record<SdohDomain, string> = {
  housing: 'Z59.0',
  food: 'Z59.4',
  transportation: 'Z59.82',
  utilities: 'Z59.1',
  financial_strain: 'Z59.86',
  social_isolation: 'Z60.2',
  interpersonal_safety: 'Z63',
  employment: 'Z56',
}

const outboundExcludedDomains = new Set<SdohDomain>(['interpersonal_safety'])
const now = (): string => '2026-07-04T09:00:00'

function sumAnswers(answers: number[]): number {
  return answers.reduce((total, answer) => total + answer, 0)
}

function phqSeverity(totalScore: number): PhqSeverity {
  if (totalScore >= 20) return 'severe'
  if (totalScore >= 15) return 'moderately_severe'
  if (totalScore >= 10) return 'moderate'
  if (totalScore >= 5) return 'mild'
  return 'none_minimal'
}

function gadSeverity(totalScore: number): GadSeverity {
  if (totalScore >= 15) return 'severe'
  if (totalScore >= 10) return 'moderate'
  if (totalScore >= 5) return 'mild'
  return 'minimal'
}

export function scorePhq2(answers: number[]): Phq2Score {
  const totalScore = sumAnswers(answers)

  return {
    instrument: 'phq2',
    totalScore,
    positive: totalScore >= 3,
    nextInstrument: totalScore >= 3 ? 'phq9' : null,
  }
}

export function scorePhq9(answers: number[]): Phq9Score {
  const totalScore = sumAnswers(answers)

  return {
    instrument: 'phq9',
    totalScore,
    severity: phqSeverity(totalScore),
    crisisItemPositive: (answers[8] ?? 0) >= 1,
  }
}

export function scoreGad7(answers: number[]): Gad7Score {
  const totalScore = sumAnswers(answers)

  return {
    instrument: 'gad7',
    totalScore,
    severity: gadSeverity(totalScore),
  }
}

export function routeScreeningResult(input: RouteScreeningInput): ScreeningRoute {
  const freeTextCrisis = input.freeText ? screenPatientMessage(input.freeText).category === 'red_flag' : false

  if (input.instrument === 'phq9') {
    const score = scorePhq9(input.answers)
    if (score.crisisItemPositive || freeTextCrisis) {
      return {
        eventType: 'crisis_route_triggered',
        state: 'navigator_review',
        navigatorReason: 'crisis_escalation',
        navigatorPriority: 'urgent',
        action: 'route_988',
        continueInstrument: false,
        totalScore: score.totalScore,
        severity: score.severity,
      }
    }

    if (score.totalScore >= 10) {
      return {
        eventType: 'screening_scored',
        state: 'referral_needed',
        navigatorReason: 'positive_screen_followup',
        navigatorPriority: 'soon',
        action: 'navigator_followup',
        continueInstrument: false,
        totalScore: score.totalScore,
        severity: score.severity,
      }
    }

    if (score.totalScore >= 5) {
      return {
        eventType: 'screening_scored',
        state: 'signal_collected',
        navigatorReason: 'positive_screen_followup',
        navigatorPriority: 'routine',
        action: 'navigator_followup',
        continueInstrument: false,
        totalScore: score.totalScore,
        severity: score.severity,
      }
    }

    return {
      eventType: 'screening_scored',
      state: 'closed_resolved',
      navigatorReason: null,
      navigatorPriority: null,
      action: 'none',
      continueInstrument: false,
      totalScore: score.totalScore,
      severity: score.severity,
    }
  }

  const score = scoreGad7(input.answers)
  if (score.totalScore >= 10) {
    return {
      eventType: 'screening_scored',
      state: 'referral_needed',
      navigatorReason: 'positive_screen_followup',
      navigatorPriority: 'soon',
      action: 'navigator_followup',
      continueInstrument: false,
      totalScore: score.totalScore,
      severity: score.severity,
    }
  }

  return {
    eventType: 'screening_scored',
    state: score.totalScore >= 5 ? 'signal_collected' : 'closed_resolved',
    navigatorReason: score.totalScore >= 5 ? 'positive_screen_followup' : null,
    navigatorPriority: score.totalScore >= 5 ? 'routine' : null,
    action: score.totalScore >= 5 ? 'navigator_followup' : 'none',
    continueInstrument: false,
    totalScore: score.totalScore,
    severity: score.severity,
  }
}

export function raiseSdohFlag(input: RaiseSdohFlagInput): SdohFlag {
  return {
    id: `sdoh_${input.patientId}_${input.domain}`,
    patientId: input.patientId,
    domain: input.domain,
    zCode: sdohZCodes[input.domain],
    source: input.source,
    confidence: input.source === 'passive_barrier_tag' ? 'needs_review' : 'patient_reported',
    status: 'raised',
    sourceFactIds: input.sourceFactIds,
    barrierId: input.barrierId,
    navigatorPriority: input.domain === 'interpersonal_safety' ? 'soon' : 'routine',
    canAutoRefer: input.source === 'prapare_intake' && input.domain !== 'interpersonal_safety',
  }
}

export function canSdohFlagChangeCarePriority(_flag: SdohFlag): boolean {
  return false
}

export function isOutboundCategoryAllowed(domain: SdohDomain, channel: OutboundChannel): boolean {
  if (channel === 'in_app') return true
  return !outboundExcludedDomains.has(domain)
}

export function evaluateCampaignCohort(input: CampaignCohortInput): CampaignRun {
  const eligiblePatientIds = input.patients
    .filter((patient) => {
      const hasRisk = patient.age >= 65 || patient.conditions.includes('diabetes')
      return hasRisk && !patient.immunizations.includes(`flu_${input.season}`)
    })
    .map((patient) => patient.id)
    .sort()

  return {
    id: `camp_${input.packId}_${input.season}`,
    packId: input.packId,
    packVersion: '1.0.0',
    cohortSnapshotAt: now(),
    eligiblePatientIds,
    enrolledCount: eligiblePatientIds.length,
    pacingProfile: {
      perDayCap: 1,
      startAt: now(),
      channelLadder: ['in_app', 'sms', 'offer_human'],
    },
    status: 'running',
  }
}

export function createCampaignBarrierTask(input: {
  patientId: string
  campaignId: string
  barrier: CampaignBarrier
  sourceEventIds: string[]
}): NavigatorQueueItem {
  const reasonByBarrier: Record<CampaignBarrier, NavigatorQueueReason> = {
    transportation: 'transportation_barrier',
    cost: 'cost_barrier',
    after_hours: 'after_hours_needed',
  }

  return {
    id: `nav_campaign_${input.patientId}_flu_campaign_${input.barrier}`,
    patientId: input.patientId,
    reason: reasonByBarrier[input.barrier],
    priority: 'routine',
    summary: `Vaccination campaign barrier reported: ${input.barrier}.`,
    suggestedAction: 'Help resolve the barrier and confirm the campaign plan.',
    status: 'open',
    createdAt: now(),
    sourceEventIds: input.sourceEventIds,
  }
}
