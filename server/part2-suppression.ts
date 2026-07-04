import { priorityForQueueReason } from '../src/lib/retinopathy-protocol'
import type { NavigatorQueueItem, SourceFact } from '../src/types'
import { appendAuditEvent } from './audit'
import type { BackendState } from './types'

export interface IngestHieDischargeEventInput {
  patientId: string
  sourceName: string
  facilityName: string
  dischargeDisposition: string
  effectiveDate: string
  retrievedAt: string
  fhirRef?: string
}

export interface IngestHieDischargeEventResult {
  state: BackendState
  decision: 'accepted' | 'navigator_review'
  acceptedSourceFact?: SourceFact
}

let part2Counter = 0

const NOW = '2026-07-04T09:00:00'
const SENSITIVE_FACILITY_PATTERN = /recovery|addiction|substance|opioid|methadone|detox/i
const SENSITIVE_DISPOSITIONS = new Set([
  'part2_restricted',
  'sud_program_discharge',
  'substance_use_treatment_discharge',
])
const SAFE_DISPOSITIONS = new Set([
  'home',
  'transferred',
  'skilled_nursing',
  'left_against_medical_advice',
])

function nextId(prefix: string): string {
  part2Counter += 1
  return `${prefix}_${part2Counter}`
}

function normalizedDisposition(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, '_')
}

function isSensitive(input: IngestHieDischargeEventInput): boolean {
  return (
    SENSITIVE_FACILITY_PATTERN.test(input.facilityName) ||
    SENSITIVE_DISPOSITIONS.has(normalizedDisposition(input.dischargeDisposition))
  )
}

function isRecognizedSafeDisposition(input: IngestHieDischargeEventInput): boolean {
  return SAFE_DISPOSITIONS.has(normalizedDisposition(input.dischargeDisposition))
}

function segmentedReviewQueueItem(patientId: string, summary: string): NavigatorQueueItem {
  return {
    id: nextId('queue'),
    patientId,
    reason: 'segmented_data_review',
    priority: priorityForQueueReason('segmented_data_review'),
    summary,
    suggestedAction: 'Confirm consent and segmentation rules before exposing this encounter anywhere else.',
    status: 'open',
    createdAt: NOW,
    sourceEventIds: [],
  }
}

function restrictedFact(input: IngestHieDischargeEventInput): SourceFact {
  return {
    id: nextId('fact'),
    patientId: input.patientId,
    label: 'Restricted discharge event',
    value: 'A restricted facility encounter requires navigator review before protocol use.',
    sourceKind: 'hie',
    sourceName: 'KHIE restricted feed',
    retrievedAt: input.retrievedAt,
    effectiveDate: input.effectiveDate,
    confidence: 'needs_review',
    patientConfirmed: false,
    navigatorOverridden: false,
    fhirRef: input.fhirRef,
    sensitiveCategory: 'part2_sud',
    aiContextSuppressed: true,
  }
}

function safeDischargeFact(input: IngestHieDischargeEventInput): SourceFact {
  return {
    id: nextId('fact'),
    patientId: input.patientId,
    label: 'Hospital discharge',
    value: `Discharged from ${input.facilityName} to ${normalizedDisposition(input.dischargeDisposition)}`,
    sourceKind: 'hie',
    sourceName: input.sourceName,
    retrievedAt: input.retrievedAt,
    effectiveDate: input.effectiveDate,
    confidence: 'confirmed',
    patientConfirmed: false,
    navigatorOverridden: false,
    fhirRef: input.fhirRef,
  }
}

function appendFact(state: BackendState, fact: SourceFact): BackendState {
  return {
    ...state,
    updatedAt: NOW,
    data: {
      ...state.data,
      sourceFacts: [...state.data.sourceFacts, fact],
    },
  }
}

function appendSegmentedQueue(state: BackendState, item: NavigatorQueueItem): BackendState {
  return {
    ...state,
    updatedAt: NOW,
    data: {
      ...state.data,
      navigatorQueue: [...state.data.navigatorQueue, item],
    },
  }
}

export function ingestHieDischargeEvent(
  state: BackendState,
  input: IngestHieDischargeEventInput,
): IngestHieDischargeEventResult {
  if (isSensitive(input)) {
    const fact = restrictedFact(input)
    const queued = appendSegmentedQueue(
      appendFact(state, fact),
      segmentedReviewQueueItem(
        input.patientId,
        'Restricted HIE discharge evidence requires privacy review before protocol use.',
      ),
    )

    return {
      decision: 'navigator_review',
      acceptedSourceFact: fact,
      state: appendAuditEvent(queued, {
        actor: 'system',
        action: 'part2_discharge_suppressed',
        outcome: 'blocked',
        patientId: input.patientId,
        sourceIds: [fact.id],
        detail: 'Restricted HIE discharge evidence was suppressed before protocol, insight, navigator, or outbound exposure.',
      }),
    }
  }

  if (!isRecognizedSafeDisposition(input)) {
    const queued = appendSegmentedQueue(
      state,
      segmentedReviewQueueItem(
        input.patientId,
        'Unrecognized HIE discharge disposition requires privacy review before protocol use.',
      ),
    )

    return {
      decision: 'navigator_review',
      state: appendAuditEvent(queued, {
        actor: 'system',
        action: 'part2_discharge_failed_closed',
        outcome: 'blocked',
        patientId: input.patientId,
        detail: 'Unrecognized HIE discharge disposition was held for segmented privacy review.',
      }),
    }
  }

  const fact = safeDischargeFact(input)
  const withFact = appendFact(state, fact)

  return {
    decision: 'accepted',
    acceptedSourceFact: fact,
    state: appendAuditEvent(withFact, {
      actor: 'system',
      action: 'hie_discharge_ingested',
      outcome: 'allowed',
      patientId: input.patientId,
      sourceIds: [fact.id],
      detail: 'Recognized non-sensitive HIE discharge evidence was ingested.',
    }),
  }
}
