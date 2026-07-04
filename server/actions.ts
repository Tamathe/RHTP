import { nextProtocolStatus, priorityForQueueReason, queueReasonForBarrier } from '../src/lib/retinopathy-protocol'
import { screenPatientMessage } from '../src/lib/safety'
import { crisisGateCorpus, CRISIS_RECALL_FLOOR } from '../src/lib/crisis-red-flags.corpus'
import { measureCrisisRecall } from '../src/lib/crisis-red-flags'
import { explainMatch, rankSites, type MatchMode } from '../src/lib/site-matching'
import {
  isRetinopathyConversationTool,
  RETINOPATHY_PACK_ID,
} from '../src/lib/sandy-tools'
import {
  corroborateIdentity,
  type ExternalIdentityRecord,
  type IdentityCorroborationResult,
  type IdentityMatchMethod,
  type StrongIdentifier,
} from '../src/lib/identity-corroboration'
import type {
  BarrierType,
  CarePlanTask,
  NavigatorQueueReason,
  OpsAlert,
  ProtocolActor,
  ProtocolEvent,
  ProtocolEventType,
  ProtocolStatus,
  RuleGapTicket,
  ResultOutcome,
  SpeechActLabel,
  ToolCallDecision,
  ToolCallRecord,
  ToolRefusalReason,
  ToolResult,
  TranscriptSegment,
  VoiceSession,
  VoiceSpeaker,
  VoiceTurnSafety,
} from '../src/types'
import { appendAuditEvent } from './audit'
import type { BackendState } from './types'

export interface RecordVoiceReplyInput {
  patientId: string
  text: string
  modelBackstopMatched?: boolean
  modelBackstopLabel?: string
}

export type ModelBackstopStatus = 'available' | 'degraded' | 'unavailable'

export interface RecordModelBackstopHealthInput {
  status: ModelBackstopStatus
  detail: string
}

export type RealVoiceSessionIssueReason =
  | 'missing_api_key'
  | 'provider_error'
  | 'invalid_provider_response'

export interface RecordRealVoiceSessionIssueInput {
  patientId: string
  reason: RealVoiceSessionIssueReason
  detail: string
}

export interface RecordRealtimeVoiceSessionStartedInput {
  patientId: string
  model: string
  safetyIdentifier: string
}

export interface RecordRealtimeTranscriptSegmentInput {
  voiceSessionId: string
  speaker: VoiceSpeaker
  text: string
  safety: VoiceTurnSafety
  classifierLabels: SpeechActLabel[]
}

export interface InvokeSandyToolInput {
  patientId: string
  voiceSessionId?: string
  toolName: string
  input: unknown
  modelId: string
  modelVersion: string
}

export interface InvokeSandyToolResult {
  state: BackendState
  toolResult: ToolResult
}

export interface RecordIdentityCorroborationInput {
  patientId: string
  candidateDateOfBirth?: string
  candidateStrongIdentifier?: StrongIdentifier
  externalSystem: string
  externalRecordId: string
  matchMethod: IdentityMatchMethod
  matchConfidence: number
  strongIdentifier?: StrongIdentifier
  externalName?: string
  externalDateOfBirth?: string
  patientConfirmed?: boolean
}

export interface RecordIdentityCorroborationResult {
  state: BackendState
  corroboration: IdentityCorroborationResult
}

type ParsedSandyToolInput =
  | { toolName: 'answer_education'; question: string }
  | { toolName: 'collect_barrier'; text: string }
  | { toolName: 'match_site'; mode: MatchMode }
  | { toolName: 'confirm_plan'; siteId: string; when: string }

let actionCounter = 0

const now = (): string => '2026-07-04T09:00:00'

const RED_FLAG_LOCK_COPY =
  'A navigator already needs to review this urgent vision concern. Sandy cannot continue routine coaching until a human has helped.'
const TOOL_REFUSAL_COPY: Record<ToolRefusalReason, string> = {
  invalid_input: 'Sandy could not use that tool because the tool input was malformed.',
  patient_not_found: 'Sandy could not use that tool because the patient was not found.',
  voice_session_not_found: 'Sandy could not use that tool because the voice session was not found.',
  pack_not_authorized: 'Sandy cannot use that tool for this protocol pack.',
  consent_missing: 'Sandy cannot use that tool until consent is active for this protocol.',
  red_flag_lock: 'A navigator must review the urgent concern before Sandy can continue routine coaching.',
}

function nextId(prefix: string): string {
  actionCounter += 1
  return `${prefix}_${actionCounter}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function latestProtocolStatus(state: BackendState, patientId: string): ProtocolStatus {
  return (
    [...state.data.protocolEvents].reverse().find((event) => event.patientId === patientId)?.status ??
    'identified'
  )
}

function patientSourceFactIds(state: BackendState, patientId: string): string[] {
  return state.data.sourceFacts.filter((fact) => fact.patientId === patientId).map((fact) => fact.id)
}

function protocolInstanceIdForPatient(state: BackendState, patientId: string): string {
  return state.data.gaps.find((gap) => gap.patientId === patientId)?.id ?? `protoinst_${patientId}`
}

function hasOpenRedFlag(state: BackendState, patientId: string): boolean {
  return state.data.redFlagEvents.some((event) => event.patientId === patientId && event.status === 'open')
}

function hasActiveConsent(state: BackendState, patientId: string): boolean {
  return state.data.consents.some((consent) => consent.patientId === patientId && consent.status === 'active')
}

function protocolEvent(
  state: BackendState,
  patientId: string,
  type: ProtocolEventType,
  label: string,
  actor: ProtocolActor,
  outcome?: ResultOutcome,
): ProtocolEvent {
  return {
    id: nextId('proto'),
    patientId,
    type,
    label,
    status: nextProtocolStatus(latestProtocolStatus(state, patientId), type, outcome),
    createdAt: now(),
    actor,
    sourceFactIds: patientSourceFactIds(state, patientId),
  }
}

function queueItem(
  patientId: string,
  reason: NavigatorQueueReason,
  summary: string,
  suggestedAction: string,
  sourceEventIds: string[],
) {
  return {
    id: nextId('queue'),
    patientId,
    reason,
    priority: priorityForQueueReason(reason),
    summary,
    suggestedAction,
    status: 'open' as const,
    createdAt: now(),
    sourceEventIds,
  }
}

function ruleGapTicket(
  patientId: string,
  text: string,
  modelBackstopLabel: string,
  sourceEventIds: string[],
): RuleGapTicket {
  return {
    id: nextId('rulegap'),
    patientId,
    text,
    source: 'model_backstop',
    modelBackstopLabel,
    status: 'open',
    createdAt: now(),
    sourceEventIds,
  }
}

function opsAlert(input: RecordModelBackstopHealthInput): OpsAlert {
  const recallReport = measureCrisisRecall(crisisGateCorpus)
  const severity = recallReport.recall >= CRISIS_RECALL_FLOOR ? 'warning' : 'critical'

  return {
    id: nextId('ops'),
    type: 'model_backstop_degraded',
    severity,
    status: 'open',
    message: `Model backstop is ${input.status}; deterministic crisis recall is ${recallReport.recall.toFixed(
      2,
    )} against floor ${CRISIS_RECALL_FLOOR}.`,
    detail: input.detail,
    createdAt: now(),
  }
}

function realVoiceOpsAlert(input: RecordRealVoiceSessionIssueInput): OpsAlert {
  return {
    id: nextId('ops'),
    type: input.reason === 'missing_api_key' ? 'real_voice_config_blocked' : 'real_voice_provider_error',
    severity: 'critical',
    status: 'open',
    message:
      input.reason === 'missing_api_key'
        ? 'Real voice flag is enabled but server credentials are missing.'
        : 'Real voice provider session mint failed.',
    detail: input.detail,
    createdAt: now(),
  }
}

function barrierFromReply(text: string): BarrierType | null {
  if (/ride|transport/i.test(text)) return 'transportation'
  if (/cost|pay|insurance/i.test(text)) return 'cost'
  if (/after work|saturday|evening|weekend/i.test(text)) return 'after_hours'
  if (/already|done|completed/i.test(text)) return 'already_completed'
  if (/not ready|scared|afraid/i.test(text)) return 'not_ready'
  return null
}

function parseToolInput(toolName: string, input: Record<string, unknown>): ParsedSandyToolInput | null {
  if (toolName === 'answer_education' && typeof input.question === 'string' && input.question.trim()) {
    return { toolName, question: input.question.trim() }
  }

  if (toolName === 'collect_barrier' && typeof input.text === 'string' && input.text.trim()) {
    return { toolName, text: input.text.trim() }
  }

  if (toolName === 'match_site') {
    const mode = input.mode
    if (mode === undefined) return { toolName, mode: 'best' }
    if (mode === 'best' || mode === 'fastest' || mode === 'closest') return { toolName, mode }
  }

  if (
    toolName === 'confirm_plan' &&
    typeof input.siteId === 'string' &&
    input.siteId.trim() &&
    typeof input.when === 'string' &&
    input.when.trim()
  ) {
    return { toolName, siteId: input.siteId.trim(), when: input.when.trim() }
  }

  return null
}

function toolCallRecord(
  state: BackendState,
  input: InvokeSandyToolInput,
  safeInput: Record<string, unknown>,
  decision: ToolCallDecision,
  emittedEventId?: string,
): ToolCallRecord {
  return {
    id: nextId('tool'),
    voiceSessionId: input.voiceSessionId,
    patientId: input.patientId,
    protocolInstanceId: protocolInstanceIdForPatient(state, input.patientId),
    packId: RETINOPATHY_PACK_ID,
    toolName: input.toolName,
    input: safeInput,
    decision,
    emittedEventId,
    modelId: input.modelId,
    modelVersion: input.modelVersion,
    createdAt: now(),
  }
}

function appendToolCall(state: BackendState, call: ToolCallRecord): BackendState {
  return {
    ...state,
    updatedAt: now(),
    data: {
      ...state.data,
      toolCalls: [...state.data.toolCalls, call],
    },
  }
}

function appendToolAudit(state: BackendState, call: ToolCallRecord, detail: string): BackendState {
  return appendAuditEvent(state, {
    actor: 'sandy',
    action: 'sandy_tool_called',
    outcome: call.decision,
    patientId: call.patientId,
    sourceIds: patientSourceFactIds(state, call.patientId),
    modelId: call.modelId,
    modelVersion: call.modelVersion,
    sessionId: call.voiceSessionId,
    toolName: call.toolName,
    packId: call.packId,
    detail,
  })
}

function refusedToolCall(
  state: BackendState,
  input: InvokeSandyToolInput,
  safeInput: Record<string, unknown>,
  decision: Extract<ToolCallDecision, 'blocked' | 'failed'>,
  refusalReason: ToolRefusalReason,
): InvokeSandyToolResult {
  const call = toolCallRecord(state, input, safeInput, decision)
  const withCall = appendToolCall(state, call)

  return {
    state: appendToolAudit(withCall, call, TOOL_REFUSAL_COPY[refusalReason]),
    toolResult: {
      ok: false,
      toolName: input.toolName,
      refusalReason,
      message: TOOL_REFUSAL_COPY[refusalReason],
    },
  }
}

function carePlanTask(patientId: string, siteId: string, siteName: string, when: string): CarePlanTask {
  return {
    id: nextId('care'),
    patientId,
    siteId,
    step: `Complete retinal screening at ${siteName}`,
    when,
  }
}

function identityCandidateFromState(state: BackendState, input: RecordIdentityCorroborationInput) {
  const patient = state.data.patients.find((candidate) => candidate.id === input.patientId)
  const strongIds =
    input.candidateStrongIdentifier === undefined
      ? undefined
      : { [input.candidateStrongIdentifier.kind]: input.candidateStrongIdentifier.value }

  return {
    patientId: input.patientId,
    name: patient?.name ?? '',
    dateOfBirth: input.candidateDateOfBirth,
    strongIds,
  }
}

function externalIdentityFromInput(input: RecordIdentityCorroborationInput): ExternalIdentityRecord {
  return {
    externalSystem: input.externalSystem,
    externalRecordId: input.externalRecordId,
    matchMethod: input.matchMethod,
    matchConfidence: input.matchConfidence,
    strongIdentifier: input.strongIdentifier,
    name: input.externalName,
    dateOfBirth: input.externalDateOfBirth,
    patientConfirmed: input.patientConfirmed,
  }
}

export function recordIdentityCorroboration(
  state: BackendState,
  input: RecordIdentityCorroborationInput,
): RecordIdentityCorroborationResult {
  const corroboration = corroborateIdentity(identityCandidateFromState(state, input), externalIdentityFromInput(input))
  const withQueue =
    corroboration.decision === 'navigator_review' && corroboration.queueReason
      ? {
          ...state,
          updatedAt: now(),
          data: {
            ...state.data,
            navigatorQueue: [
              ...state.data.navigatorQueue,
              queueItem(
                input.patientId,
                corroboration.queueReason,
                `Identity match from ${input.externalSystem} requires review before linkage.`,
                'Compare DOB/name evidence and confirm the external record belongs to this patient before any outreach.',
                [],
              ),
            ],
          },
        }
      : { ...state, updatedAt: now() }
  const audited = appendAuditEvent(withQueue, {
    actor: 'system',
    action: 'identity_corroboration_checked',
    outcome: corroboration.decision === 'auto_link' ? 'allowed' : 'blocked',
    patientId: input.patientId,
    sourceIds: patientSourceFactIds(state, input.patientId),
    detail: `${corroboration.reason} externalSystem=${input.externalSystem}; externalRecordId=${input.externalRecordId}; autonomousOutreachAllowed=${corroboration.autonomousOutreachAllowed}.`,
  })

  return { state: audited, corroboration }
}

export function startVoiceSession(state: BackendState, patientId: string): BackendState {
  if (hasOpenRedFlag(state, patientId)) {
    const blocked = {
      ...state,
      updatedAt: now(),
      data: {
        ...state.data,
        voiceTurns: [
          ...state.data.voiceTurns,
          {
            id: nextId('voice'),
            patientId,
            speaker: 'sandy' as const,
            text: RED_FLAG_LOCK_COPY,
            createdAt: now(),
            mode: 'voice' as const,
            safety: 'red_flag' as const,
          },
        ],
      },
    }

    return appendAuditEvent(blocked, {
      actor: 'sandy',
      action: 'voice_session_started',
      outcome: 'blocked',
      patientId,
      sourceIds: patientSourceFactIds(state, patientId),
      detail: 'Routine Sandy coaching blocked because an open red flag needs human review.',
    })
  }

  const event = protocolEvent(
    state,
    patientId,
    'sandy_explained_gap',
    'Sandy explained the retinal screening gap',
    'sandy',
  )
  const updated = {
    ...state,
    updatedAt: now(),
    data: {
      ...state.data,
      protocolEvents: [...state.data.protocolEvents, event],
      voiceTurns: [
        ...state.data.voiceTurns,
        {
          id: nextId('voice'),
          patientId,
          speaker: 'sandy' as const,
          text:
            'I am Sandy. I can help with your diabetes eye screening plan, explain why it matters, find a screening site, and bring in a navigator when needed.',
          createdAt: now(),
          mode: 'voice' as const,
          safety: 'normal' as const,
        },
      ],
    },
  }

  return appendAuditEvent(updated, {
    actor: 'sandy',
    action: 'voice_session_started',
    outcome: 'allowed',
    patientId,
    sourceIds: event.sourceFactIds,
    detail: 'Sandy voice session started for protocol-bound retinopathy outreach.',
  })
}

export function recordVoiceReply(state: BackendState, input: RecordVoiceReplyInput): BackendState {
  const screened = screenPatientMessage(input.text, {
    modelBackstopMatched: input.modelBackstopMatched,
    modelBackstopLabel: input.modelBackstopLabel,
  })
  const patientTurn = {
    id: nextId('voice'),
    patientId: input.patientId,
    speaker: 'patient' as const,
    text: input.text,
    createdAt: now(),
    mode: 'voice' as const,
    safety: screened.category === 'red_flag' ? ('red_flag' as const) : ('normal' as const),
  }

  if (hasOpenRedFlag(state, input.patientId)) {
    const locked = {
      ...state,
      updatedAt: now(),
      data: {
        ...state.data,
        voiceTurns: [
          ...state.data.voiceTurns,
          patientTurn,
          {
            id: nextId('voice'),
            patientId: input.patientId,
            speaker: 'sandy' as const,
            text: RED_FLAG_LOCK_COPY,
            createdAt: now(),
            mode: 'voice' as const,
            safety: 'red_flag' as const,
          },
        ],
      },
    }

    return appendAuditEvent(locked, {
      actor: 'patient',
      action: 'voice_reply_recorded',
      outcome: 'blocked',
      patientId: input.patientId,
      sourceIds: patientSourceFactIds(state, input.patientId),
      detail: 'Patient reply preserved, but routine coaching remained locked for open red flag.',
    })
  }

  if (screened.category === 'red_flag') {
    const event = protocolEvent(
      state,
      input.patientId,
      'red_flag_reported',
      'Possible vision red flag reported',
      'patient',
    )
    const ruleGapTickets = screened.requiresRuleGapTicket
      ? [
          ruleGapTicket(
            input.patientId,
            input.text,
            screened.modelBackstopLabel ?? 'unknown_model_backstop_hit',
            [event.id],
          ),
        ]
      : []
    const updated = {
      ...state,
      updatedAt: now(),
      data: {
        ...state.data,
        protocolEvents: [...state.data.protocolEvents, event],
        voiceTurns: [
          ...state.data.voiceTurns,
          patientTurn,
          {
            id: nextId('voice'),
            patientId: input.patientId,
            speaker: 'sandy' as const,
            text: screened.patientCopy,
            createdAt: now(),
            mode: 'voice' as const,
            safety: 'red_flag' as const,
          },
        ],
        redFlagEvents: [
          ...state.data.redFlagEvents,
          {
            id: nextId('red'),
            patientId: input.patientId,
            symptom: input.text,
            action: 'Navigator urgent review',
            createdAt: now(),
            status: 'open' as const,
          },
        ],
        navigatorQueue: [
          ...state.data.navigatorQueue,
          queueItem(
            input.patientId,
            'red_flag_symptom',
            screened.navigatorSummary,
            'Call the patient and route to urgent clinical guidance.',
            [event.id],
          ),
        ],
        ruleGapTickets: [...state.data.ruleGapTickets, ...ruleGapTickets],
      },
    }

    return appendAuditEvent(updated, {
      actor: 'patient',
      action: 'voice_reply_recorded',
      outcome: 'allowed',
      patientId: input.patientId,
      sourceIds: event.sourceFactIds,
      detail: 'Patient reported a possible red-flag symptom; urgent navigator work created.',
    })
  }

  const barrier = barrierFromReply(input.text)
  if (barrier) {
    const event = protocolEvent(
      state,
      input.patientId,
      barrier === 'already_completed' ? 'already_completed_claimed' : 'barrier_reported',
      barrier === 'already_completed' ? 'Patient reported screening already completed' : 'Barrier reported by voice API',
      'patient',
    )
    const reason = queueReasonForBarrier(barrier)
    const updated = {
      ...state,
      updatedAt: now(),
      data: {
        ...state.data,
        protocolEvents: [...state.data.protocolEvents, event],
        voiceTurns: [...state.data.voiceTurns, patientTurn],
        barriers: [
          ...state.data.barriers,
          {
            id: nextId('bar'),
            patientId: input.patientId,
            type: barrier,
            detail: input.text,
            reportedVia: 'voice_api',
          },
        ],
        navigatorQueue: [
          ...state.data.navigatorQueue,
          queueItem(
            input.patientId,
            reason,
            barrier === 'already_completed'
              ? 'Patient says screening already happened and needs reconciliation.'
              : `Patient said: ${input.text}`,
            barrier === 'already_completed'
              ? 'Review provenance and reconcile the reported completion.'
              : 'Help resolve the barrier and confirm the screening plan.',
            [event.id],
          ),
        ],
      },
    }

    return appendAuditEvent(updated, {
      actor: 'patient',
      action: 'voice_reply_recorded',
      outcome: 'allowed',
      patientId: input.patientId,
      sourceIds: event.sourceFactIds,
      detail: `Patient reply created navigator work for ${reason}.`,
    })
  }

  const event = protocolEvent(
    state,
    input.patientId,
    'question_answered',
    'Question answered by Sandy',
    'sandy',
  )
  const updated = {
    ...state,
    updatedAt: now(),
    data: {
      ...state.data,
      protocolEvents: [...state.data.protocolEvents, event],
      voiceTurns: [
        ...state.data.voiceTurns,
        patientTurn,
        {
          id: nextId('voice'),
          patientId: input.patientId,
          speaker: 'sandy' as const,
          text: screened.patientCopy,
          createdAt: now(),
          mode: 'voice' as const,
          safety: screened.category === 'off_protocol' ? ('fallback' as const) : ('normal' as const),
        },
      ],
    },
  }

  return appendAuditEvent(updated, {
    actor: 'sandy',
    action: 'voice_reply_recorded',
    outcome: 'allowed',
    patientId: input.patientId,
    sourceIds: event.sourceFactIds,
    detail:
      screened.category === 'off_protocol'
        ? 'Sandy used off-protocol fallback copy and preserved the transcript.'
        : 'Sandy answered inside the retinopathy outreach protocol.',
  })
}

export function recordModelBackstopHealth(
  state: BackendState,
  input: RecordModelBackstopHealthInput,
): BackendState {
  const alerts = input.status === 'available' ? [] : [opsAlert(input)]
  const updated = {
    ...state,
    updatedAt: now(),
    data: {
      ...state.data,
      opsAlerts: [...state.data.opsAlerts, ...alerts],
    },
  }

  return appendAuditEvent(updated, {
    actor: 'system',
    action: 'model_backstop_health_recorded',
    outcome: 'allowed',
    sourceIds: [],
    detail:
      input.status === 'available'
        ? 'Model backstop reported available.'
        : `Model backstop reported ${input.status}: ${input.detail}`,
  })
}

export function recordRealVoiceSessionIssue(
  state: BackendState,
  input: RecordRealVoiceSessionIssueInput,
): BackendState {
  const alert = realVoiceOpsAlert(input)
  const updated = {
    ...state,
    updatedAt: now(),
    data: {
      ...state.data,
      opsAlerts: [...state.data.opsAlerts, alert],
    },
  }

  return appendAuditEvent(updated, {
    actor: 'system',
    action: 'realtime_voice_session_blocked',
    outcome: 'blocked',
    patientId: input.patientId,
    sourceIds: patientSourceFactIds(state, input.patientId),
    detail: input.detail,
  })
}

export function recordRealtimeVoiceSessionStarted(
  state: BackendState,
  input: RecordRealtimeVoiceSessionStartedInput,
): BackendState {
  const event = protocolEvent(
    state,
    input.patientId,
    'sandy_explained_gap',
    'Sandy explained the retinal screening gap',
    'sandy',
  )
  const session: VoiceSession = {
    id: nextId('voice'),
    patientId: input.patientId,
    protocolInstanceId: protocolInstanceIdForPatient(state, input.patientId),
    packId: 'retinopathy',
    channel: 'voice',
    realtimeModelId: input.model,
    safetyIdentifier: input.safetyIdentifier,
    status: 'active',
    startedAt: now(),
  }
  const updated = {
    ...state,
    updatedAt: now(),
    data: {
      ...state.data,
      protocolEvents: [...state.data.protocolEvents, event],
      voiceSessions: [...state.data.voiceSessions, session],
    },
  }

  return appendAuditEvent(updated, {
    actor: 'system',
    action: 'realtime_voice_client_secret_minted',
    outcome: 'allowed',
    patientId: input.patientId,
    sourceIds: event.sourceFactIds,
    detail: `Realtime voice client secret minted for ${input.model}. Secret value was not persisted.`,
  })
}

export function recordRealtimeTranscriptSegment(
  state: BackendState,
  input: RecordRealtimeTranscriptSegmentInput,
): BackendState {
  const session = state.data.voiceSessions.find((candidate) => candidate.id === input.voiceSessionId)

  if (!session) {
    return appendAuditEvent(state, {
      actor: 'system',
      action: 'realtime_transcript_segment_recorded',
      outcome: 'failed',
      sourceIds: [],
      detail: `Transcript segment rejected because voice session ${input.voiceSessionId} was not found.`,
    })
  }

  const segment: TranscriptSegment = {
    id: nextId('transcript'),
    voiceSessionId: input.voiceSessionId,
    speaker: input.speaker,
    text: input.text,
    createdAt: now(),
    safety: input.safety,
    classifierLabels: input.classifierLabels,
  }
  const updated = {
    ...state,
    updatedAt: now(),
    data: {
      ...state.data,
      transcriptSegments: [...state.data.transcriptSegments, segment],
    },
  }

  return appendAuditEvent(updated, {
    actor: 'system',
    action: 'realtime_transcript_segment_recorded',
    outcome: 'allowed',
    patientId: session.patientId,
    sourceIds: patientSourceFactIds(state, session.patientId),
    detail: `Realtime ${input.speaker} transcript segment recorded for ${input.voiceSessionId}.`,
  })
}

export function invokeSandyTool(state: BackendState, input: InvokeSandyToolInput): InvokeSandyToolResult {
  const safeInput = isRecord(input.input) ? input.input : {}
  if (!isRecord(input.input)) {
    return refusedToolCall(state, input, safeInput, 'failed', 'invalid_input')
  }

  if (!state.data.patients.some((patient) => patient.id === input.patientId)) {
    return refusedToolCall(state, input, safeInput, 'failed', 'patient_not_found')
  }

  if (
    input.voiceSessionId &&
    !state.data.voiceSessions.some(
      (session) => session.id === input.voiceSessionId && session.patientId === input.patientId,
    )
  ) {
    return refusedToolCall(state, input, safeInput, 'failed', 'voice_session_not_found')
  }

  if (!isRetinopathyConversationTool(input.toolName)) {
    return refusedToolCall(state, input, safeInput, 'blocked', 'pack_not_authorized')
  }

  if (!hasActiveConsent(state, input.patientId)) {
    return refusedToolCall(state, input, safeInput, 'blocked', 'consent_missing')
  }

  if (hasOpenRedFlag(state, input.patientId)) {
    return refusedToolCall(state, input, safeInput, 'blocked', 'red_flag_lock')
  }

  const parsed = parseToolInput(input.toolName, safeInput)
  if (!parsed) {
    return refusedToolCall(state, input, safeInput, 'failed', 'invalid_input')
  }

  if (parsed.toolName === 'answer_education') {
    const event = protocolEvent(
      state,
      input.patientId,
      'question_answered',
      'Sandy answered a protocol education question through the tool gateway',
      'sandy',
    )
    const call = toolCallRecord(state, input, safeInput, 'allowed', event.id)
    const updated = appendToolCall(
      {
        ...state,
        updatedAt: now(),
        data: {
          ...state.data,
          protocolEvents: [...state.data.protocolEvents, event],
        },
      },
      call,
    )

    return {
      state: appendToolAudit(updated, call, 'Sandy education tool allowed and protocol event emitted.'),
      toolResult: {
        ok: true,
        toolName: input.toolName,
        emittedEventId: event.id,
        message: 'Sandy may answer this retinopathy education question using approved context.',
        payload: { question: parsed.question, sourceFactIds: event.sourceFactIds },
      },
    }
  }

  if (parsed.toolName === 'collect_barrier') {
    const barrier = barrierFromReply(parsed.text) ?? 'not_ready'
    const event = protocolEvent(
      state,
      input.patientId,
      barrier === 'already_completed' ? 'already_completed_claimed' : 'barrier_reported',
      barrier === 'already_completed'
        ? 'Patient reported screening already completed through the tool gateway'
        : 'Patient barrier recorded through the tool gateway',
      'patient',
    )
    const reason = queueReasonForBarrier(barrier)
    const call = toolCallRecord(state, input, safeInput, 'allowed', event.id)
    const updated = appendToolCall(
      {
        ...state,
        updatedAt: now(),
        data: {
          ...state.data,
          protocolEvents: [...state.data.protocolEvents, event],
          barriers: [
            ...state.data.barriers,
            {
              id: nextId('bar'),
              patientId: input.patientId,
              type: barrier,
              detail: parsed.text,
              reportedVia: 'sandy_tool_gateway',
            },
          ],
          navigatorQueue: [
            ...state.data.navigatorQueue,
            queueItem(
              input.patientId,
              reason,
              barrier === 'already_completed'
                ? 'Patient says screening already happened and needs reconciliation.'
                : `Patient said: ${parsed.text}`,
              barrier === 'already_completed'
                ? 'Review provenance and reconcile the reported completion.'
                : 'Help resolve the barrier and confirm the screening plan.',
              [event.id],
            ),
          ],
        },
      },
      call,
    )

    return {
      state: appendToolAudit(updated, call, `Sandy barrier tool allowed and created ${reason} work.`),
      toolResult: {
        ok: true,
        toolName: input.toolName,
        emittedEventId: event.id,
        message: 'The patient-reported barrier was recorded for navigator follow-up.',
        payload: { barrierType: barrier, queueReason: reason },
      },
    }
  }

  if (parsed.toolName === 'match_site') {
    const site = rankSites(state.data.sites, parsed.mode).at(0)
    if (!site) {
      return refusedToolCall(state, input, safeInput, 'failed', 'invalid_input')
    }

    const event = protocolEvent(
      state,
      input.patientId,
      'site_matched',
      `Sandy matched screening site ${site.name} through the tool gateway`,
      'sandy',
    )
    const call = toolCallRecord(state, input, safeInput, 'allowed', event.id)
    const updated = appendToolCall(
      {
        ...state,
        updatedAt: now(),
        data: {
          ...state.data,
          protocolEvents: [...state.data.protocolEvents, event],
        },
      },
      call,
    )

    return {
      state: appendToolAudit(updated, call, `Sandy site-match tool allowed with mode ${parsed.mode}.`),
      toolResult: {
        ok: true,
        toolName: input.toolName,
        emittedEventId: event.id,
        message: 'A screening site was matched using deterministic site-ranking rules.',
        payload: {
          siteId: site.id,
          siteName: site.name,
          rationale: explainMatch(site, parsed.mode),
        },
      },
    }
  }

  const site = state.data.sites.find((candidate) => candidate.id === parsed.siteId)
  if (!site) {
    return refusedToolCall(state, input, safeInput, 'failed', 'invalid_input')
  }

  const event = protocolEvent(
    state,
    input.patientId,
    'appointment_confirmed',
    `Sandy confirmed retinal screening plan for ${site.name}`,
    'sandy',
  )
  const call = toolCallRecord(state, input, safeInput, 'allowed', event.id)
  const updated = appendToolCall(
    {
      ...state,
      updatedAt: now(),
      data: {
        ...state.data,
        protocolEvents: [...state.data.protocolEvents, event],
        carePlanTasks: [
          ...state.data.carePlanTasks,
          carePlanTask(input.patientId, parsed.siteId, site.name, parsed.when),
        ],
      },
    },
    call,
  )

  return {
    state: appendToolAudit(updated, call, 'Sandy plan-confirmation tool allowed and care-plan task emitted.'),
    toolResult: {
      ok: true,
      toolName: input.toolName,
      emittedEventId: event.id,
      message: 'The screening plan was confirmed and added to the care plan.',
      payload: { siteId: site.id, siteName: site.name, when: parsed.when },
    },
  }
}

export function completeNavigatorTask(
  state: BackendState,
  itemId: string,
  reviewer: string,
): BackendState {
  const item = state.data.navigatorQueue.find((candidate) => candidate.id === itemId)

  if (!item) {
    return appendAuditEvent(state, {
      actor: 'navigator',
      action: 'navigator_queue_completed',
      outcome: 'failed',
      detail: `Navigator ${reviewer} tried to complete missing queue item ${itemId}.`,
    })
  }

  const event = protocolEvent(
    state,
    item.patientId,
    'navigator_reviewed',
    `Navigator ${reviewer} reviewed returned work`,
    'navigator',
  )
  const updated = {
    ...state,
    updatedAt: now(),
    data: {
      ...state.data,
      protocolEvents: [...state.data.protocolEvents, event],
      navigatorQueue: state.data.navigatorQueue.map((candidate) =>
        candidate.id === itemId ? { ...candidate, status: 'done' as const } : candidate,
      ),
    },
  }

  return appendAuditEvent(updated, {
    actor: 'navigator',
    action: 'navigator_queue_completed',
    outcome: 'allowed',
    patientId: item.patientId,
    sourceIds: event.sourceFactIds,
    detail: `Navigator ${reviewer} completed queue item ${itemId}.`,
  })
}
