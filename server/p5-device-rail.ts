import { P5_DATA_SOURCES } from '../src/data/seed'
import type { DataSource, SourceFact } from '../src/types'
import { appendAuditEvent } from './audit'
import type { BackendState } from './types'

export type ObservationType =
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'glucose_cgm'
  | 'glucose_tir_daily'
  | 'weight_daily'

export type DeviceInsightAction =
  | 'summarize_pattern'
  | 'prepare_visit_question'
  | 'change_medication'
  | 'dose_insulin'
  | 'diagnose'

export type DeviceReadingStatus =
  | 'accepted'
  | 'source_blocked'
  | 'consent_blocked'
  | 'unit_blocked'
  | 'fhir_ref_blocked'
  | 'action_blocked'

export type ShellRuntime = 'web' | 'native'

export interface DeviceReadingInput {
  sourceId: string
  patientId: string
  observationType: ObservationType
  value: number
  unit: string
  observedAt: string
  fhirRef: string
  requestedAction?: DeviceInsightAction
}

export interface DeviceInsight {
  id: string
  ruleId: string
  patientId: string
  label: string
  detail: string
  suggestedAction: string
  clinicalAction: 'discuss_with_clinician' | 'track_pattern'
  sourceFactIds: string[]
}

export interface DeviceReadingResult {
  state: BackendState
  status: DeviceReadingStatus
  acceptedSourceFacts: SourceFact[]
  insights: DeviceInsight[]
}

export interface DeviceConnectAvailability {
  sourceId: string
  canConnect: boolean
  reason: 'native_shell_required' | 'patient_oauth_supported' | 'source_not_registered'
}

const OBSERVATION_DEFS: Record<ObservationType, { label: string; unit: string }> = {
  bp_systolic: { label: 'Systolic blood pressure', unit: 'mmHg' },
  bp_diastolic: { label: 'Diastolic blood pressure', unit: 'mmHg' },
  glucose_cgm: { label: 'CGM glucose', unit: 'mg/dL' },
  glucose_tir_daily: { label: 'Glucose time in range', unit: '%' },
  weight_daily: { label: 'Daily weight', unit: 'kg' },
}

const unsafeActions = new Set<DeviceInsightAction>(['change_medication', 'dose_insulin', 'diagnose'])
let deviceFactCounter = 0
let insightCounter = 0

function sourceById(state: BackendState, sourceId: string): DataSource | undefined {
  return state.data.dataSources.find((source) => source.id === sourceId)
}

function hasActiveConsent(state: BackendState, patientId: string): boolean {
  return state.data.consents.some((consent) => consent.patientId === patientId && consent.status === 'active')
}

function block(
  state: BackendState,
  input: DeviceReadingInput,
  status: Exclude<DeviceReadingStatus, 'accepted'>,
  detail: string,
): DeviceReadingResult {
  return {
    state: appendAuditEvent(state, {
      actor: 'system',
      action: 'p5_device_reading_blocked',
      outcome: 'blocked',
      patientId: input.patientId,
      detail,
    }),
    status,
    acceptedSourceFacts: [],
    insights: [],
  }
}

function buildInsights(input: DeviceReadingInput, sourceFactId: string): DeviceInsight[] {
  if (input.observationType === 'glucose_cgm' && input.value >= 250) {
    insightCounter += 1
    return [
      {
        id: `device_insight_${insightCounter}`,
        ruleId: 'insight.glucose.cgm_high_review',
        patientId: input.patientId,
        label: 'CGM glucose above range',
        detail: `CGM reading was ${input.value} ${input.unit}.`,
        suggestedAction:
          'Keep tracking the pattern and discuss repeated overnight highs with the primary care or diabetes care team.',
        clinicalAction: 'discuss_with_clinician',
        sourceFactIds: [sourceFactId],
      },
    ]
  }

  if (input.observationType === 'bp_systolic' && input.value >= 140) {
    insightCounter += 1
    return [
      {
        id: `device_insight_${insightCounter}`,
        ruleId: 'insight.bp.home_systolic_review',
        patientId: input.patientId,
        label: 'Home blood pressure above review range',
        detail: `Home systolic reading was ${input.value} ${input.unit}.`,
        suggestedAction:
          'Keep measuring at the same time of day and discuss repeated higher readings with the care team.',
        clinicalAction: 'discuss_with_clinician',
        sourceFactIds: [sourceFactId],
      },
    ]
  }

  return []
}

export function p5DeviceSourceIds(): string[] {
  return P5_DATA_SOURCES.filter((source) => source.kind === 'device').map((source) => source.id)
}

export function getDeviceConnectAvailability(
  runtime: ShellRuntime,
  sourceId: string,
): DeviceConnectAvailability {
  const source = P5_DATA_SOURCES.find((item) => item.id === sourceId)
  if (!source) {
    return { sourceId, canConnect: false, reason: 'source_not_registered' }
  }

  if (source.id === 'healthkit_health_connect' && runtime === 'web') {
    return { sourceId, canConnect: false, reason: 'native_shell_required' }
  }

  return { sourceId, canConnect: true, reason: 'patient_oauth_supported' }
}

export function ingestDeviceReading(state: BackendState, input: DeviceReadingInput): DeviceReadingResult {
  if (input.requestedAction && unsafeActions.has(input.requestedAction)) {
    return block(
      state,
      input,
      'action_blocked',
      `Device reading blocked because requestedAction=${input.requestedAction} crosses the no-diagnosis/no-dosing safety line.`,
    )
  }

  const source = sourceById(state, input.sourceId)
  if (!source || source.kind !== 'device') {
    return block(state, input, 'source_blocked', 'Device reading blocked because the source is not registered.')
  }

  if (!hasActiveConsent(state, input.patientId)) {
    return block(state, input, 'consent_blocked', 'Device reading blocked because active patient consent is missing.')
  }

  const definition = OBSERVATION_DEFS[input.observationType]
  if (definition.unit !== input.unit) {
    return block(
      state,
      input,
      'unit_blocked',
      `Device reading blocked because ${input.observationType} requires ${definition.unit}.`,
    )
  }

  if (input.fhirRef.trim().length === 0) {
    return block(state, input, 'fhir_ref_blocked', 'Device reading blocked because FHIR reference is missing.')
  }

  deviceFactCounter += 1
  const fact: SourceFact = {
    id: `fact_device_${deviceFactCounter}`,
    patientId: input.patientId,
    label: definition.label,
    value: `${input.value} ${input.unit}`,
    sourceKind: 'device',
    sourceName: source.name,
    retrievedAt: input.observedAt,
    effectiveDate: input.observedAt.slice(0, 10),
    confidence: 'probable',
    patientConfirmed: false,
    navigatorOverridden: false,
    fhirRef: input.fhirRef,
  }
  const nextState: BackendState = {
    ...state,
    data: {
      ...state.data,
      sourceFacts: [...state.data.sourceFacts, fact],
    },
  }
  const insights = buildInsights(input, fact.id)

  return {
    state: appendAuditEvent(nextState, {
      actor: 'system',
      action: 'p5_device_reading_ingested',
      outcome: 'allowed',
      patientId: input.patientId,
      sourceIds: [fact.id],
      detail: `Device reading accepted from source=${source.id}; observationType=${input.observationType}.`,
    }),
    status: 'accepted',
    acceptedSourceFacts: [fact],
    insights,
  }
}
