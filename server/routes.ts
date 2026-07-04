import type {
  NavigatorQueueItem,
  OpsAlert,
  Patient,
  PatientConsent,
  ProtocolEvent,
  RedFlagEvent,
  RuleGapTicket,
  SourceFact,
  ToolCallRecord,
  ToolResult,
  TranscriptSegment,
  VoiceSession,
  VoiceTurn,
} from '../src/types'
import {
  completeNavigatorTask,
  invokeSandyTool,
  recordModelBackstopHealth,
  recordRealtimeTranscriptSegment,
  recordRealtimeVoiceSessionStarted,
  recordRealVoiceSessionIssue,
  recordVoiceReply,
  startVoiceSession,
  type ModelBackstopStatus,
} from './actions'
import { createRealtimeVoiceClientSecret, type RealtimeVoiceRuntimeOptions } from './realtime-voice'
import type { BackendState, RouteResponse, StateStore } from './types'

interface PatientContextResponse {
  patient: Patient
  consent: PatientConsent | null
  sourceFacts: SourceFact[]
  protocolEvents: ProtocolEvent[]
  voiceTurns: VoiceTurn[]
  voiceSessions: VoiceSession[]
  transcriptSegments: TranscriptSegment[]
  toolCalls: ToolCallRecord[]
  redFlagEvents: RedFlagEvent[]
  ruleGapTickets: RuleGapTicket[]
  navigatorQueue: NavigatorQueueItem[]
}

interface NavigatorQueueResponseItem extends NavigatorQueueItem {
  patientName: string
  patientCounty: string
  sourceFacts: SourceFact[]
}

interface ErrorResponse {
  error: string
}

interface OpsAlertResponse {
  ok: true
  opsAlerts: OpsAlert[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isModelBackstopStatus(value: unknown): value is ModelBackstopStatus {
  return value === 'available' || value === 'degraded' || value === 'unavailable'
}

function isTranscriptSpeaker(value: unknown): value is TranscriptSegment['speaker'] {
  return value === 'patient' || value === 'sandy'
}

function isTranscriptSafety(value: unknown): value is TranscriptSegment['safety'] {
  return value === 'normal' || value === 'fallback' || value === 'red_flag'
}

function isClassifierLabel(value: unknown): value is TranscriptSegment['classifierLabels'][number] {
  return (
    value === 'education_question' ||
    value === 'barrier_report' ||
    value === 'site_preference' ||
    value === 'red_flag' ||
    value === 'off_protocol' ||
    value === 'unknown'
  )
}

function statusForToolResult(result: ToolResult): 200 | 400 | 403 | 404 | 409 {
  if (result.ok) return 200
  if (result.refusalReason === 'invalid_input') return 400
  if (result.refusalReason === 'patient_not_found' || result.refusalReason === 'voice_session_not_found') return 404
  if (result.refusalReason === 'red_flag_lock') return 409
  return 403
}

function patientContext(state: BackendState, patientId: string): RouteResponse<PatientContextResponse | ErrorResponse> {
  const patient = state.data.patients.find((candidate) => candidate.id === patientId)

  if (!patient) {
    return { status: 404, body: { error: 'Patient not found' } }
  }

  return {
    status: 200,
    body: {
      patient,
      consent: state.data.consents.find((consent) => consent.patientId === patientId) ?? null,
      sourceFacts: state.data.sourceFacts.filter((fact) => fact.patientId === patientId),
      protocolEvents: state.data.protocolEvents.filter((event) => event.patientId === patientId),
      voiceTurns: state.data.voiceTurns.filter((turn) => turn.patientId === patientId),
      voiceSessions: state.data.voiceSessions.filter((session) => session.patientId === patientId),
      transcriptSegments: state.data.transcriptSegments.filter((segment) =>
        state.data.voiceSessions.some(
          (session) => session.id === segment.voiceSessionId && session.patientId === patientId,
        ),
      ),
      toolCalls: state.data.toolCalls.filter((call) => call.patientId === patientId),
      redFlagEvents: state.data.redFlagEvents.filter((event) => event.patientId === patientId),
      ruleGapTickets: state.data.ruleGapTickets.filter(
        (ticket) => ticket.patientId === patientId && ticket.status === 'open',
      ),
      navigatorQueue: state.data.navigatorQueue.filter(
        (item) => item.patientId === patientId && item.status === 'open',
      ),
    },
  }
}

function navigatorQueue(state: BackendState): NavigatorQueueResponseItem[] {
  return state.data.navigatorQueue
    .filter((item) => item.status === 'open')
    .map((item) => {
      const patient = state.data.patients.find((candidate) => candidate.id === item.patientId)

      return {
        ...item,
        patientName: patient?.name ?? 'Unknown patient',
        patientCounty: patient?.county ?? 'Unknown county',
        sourceFacts: state.data.sourceFacts.filter((fact) => fact.patientId === item.patientId),
      }
    })
}

export async function handleApiRequest(
  store: StateStore,
  method: string,
  path: string,
  body: unknown = undefined,
  options: RealtimeVoiceRuntimeOptions = {},
): Promise<RouteResponse<unknown>> {
  const url = new URL(path, 'http://localhost')
  const segments = url.pathname.split('/').filter(Boolean)

  if (method === 'GET' && url.pathname === '/api/health') {
    return { status: 200, body: { ok: true, service: 'rhtp-backend' } }
  }

  if (method === 'POST' && url.pathname === '/api/reset') {
    const state = await store.reset()
    return { status: 200, body: { ok: true, updatedAt: state.updatedAt } }
  }

  const state = await store.load()

  if (method === 'GET' && segments[0] === 'api' && segments[1] === 'patients' && segments[3] === 'context') {
    return patientContext(state, segments[2] ?? '')
  }

  if (method === 'GET' && url.pathname === '/api/navigator/queue') {
    return { status: 200, body: navigatorQueue(state) }
  }

  if (method === 'POST' && segments[0] === 'api' && segments[1] === 'voice' && segments[3] === 'start') {
    const patientId = segments[2] ?? ''
    const updated = startVoiceSession(state, patientId)
    await store.save(updated)
    return patientContext(updated, patientId)
  }

  if (method === 'POST' && segments[0] === 'api' && segments[1] === 'voice' && segments[3] === 'reply') {
    if (!isRecord(body) || typeof body.text !== 'string') {
      return { status: 400, body: { error: 'Voice reply requires text' } }
    }

    const patientId = segments[2] ?? ''
    const updated = recordVoiceReply(state, {
      patientId,
      text: body.text,
      modelBackstopMatched:
        typeof body.modelBackstopMatched === 'boolean' ? body.modelBackstopMatched : undefined,
      modelBackstopLabel:
        typeof body.modelBackstopLabel === 'string' ? body.modelBackstopLabel : undefined,
    })
    await store.save(updated)
    return patientContext(updated, patientId)
  }

  if (
    method === 'POST' &&
    segments[0] === 'api' &&
    segments[1] === 'voice' &&
    segments[3] === 'realtime-session'
    && segments.length === 4
  ) {
    const patientId = segments[2] ?? ''
    const result = await createRealtimeVoiceClientSecret(state, patientId, options)

    if (result.ok) {
      const updated = recordRealtimeVoiceSessionStarted(state, {
        patientId,
        model: result.model,
        safetyIdentifier: result.safetyIdentifier,
      })
      const voiceSession = updated.data.voiceSessions.at(-1)
      await store.save(updated)
      return {
        status: 200,
        body: {
          ok: true,
          provider: result.provider,
          patientId: result.patientId,
          model: result.model,
          voiceSessionId: voiceSession?.id,
          clientSecret: result.clientSecret,
        },
      }
    }

    if (
      result.reason === 'missing_api_key' ||
      result.reason === 'provider_error' ||
      result.reason === 'invalid_provider_response'
    ) {
      const updated = recordRealVoiceSessionIssue(state, {
        patientId,
        reason: result.reason,
        detail: result.error,
      })
      await store.save(updated)
    }

    return { status: result.status, body: { error: result.error, reason: result.reason } }
  }

  if (
    method === 'POST' &&
    segments[0] === 'api' &&
    segments[1] === 'voice' &&
    segments[3] === 'realtime-session' &&
    segments[5] === 'transcript'
  ) {
    const patientId = segments[2] ?? ''
    const voiceSessionId = segments[4] ?? ''
    const session = state.data.voiceSessions.find(
      (candidate) => candidate.id === voiceSessionId && candidate.patientId === patientId,
    )

    if (!session) {
      return { status: 404, body: { error: 'Voice session not found' } }
    }

    if (
      !isRecord(body) ||
      !isTranscriptSpeaker(body.speaker) ||
      typeof body.text !== 'string' ||
      !isTranscriptSafety(body.safety)
    ) {
      return { status: 400, body: { error: 'Transcript segment requires speaker, text, and safety' } }
    }

    const rawLabels = Array.isArray(body.classifierLabels) ? body.classifierLabels : []
    const updated = recordRealtimeTranscriptSegment(state, {
      voiceSessionId,
      speaker: body.speaker,
      text: body.text,
      safety: body.safety,
      classifierLabels: rawLabels.filter(isClassifierLabel),
    })
    await store.save(updated)
    const segment = updated.data.transcriptSegments.at(-1)

    return segment
      ? { status: 200, body: segment }
      : { status: 404, body: { error: 'Voice session not found' } }
  }

  if (
    method === 'POST' &&
    segments[0] === 'api' &&
    segments[1] === 'voice' &&
    segments[3] === 'realtime-session' &&
    segments[5] === 'tool'
  ) {
    const patientId = segments[2] ?? ''
    const voiceSessionId = segments[4] ?? ''

    if (
      !isRecord(body) ||
      typeof body.toolName !== 'string' ||
      !isRecord(body.input) ||
      typeof body.modelId !== 'string' ||
      typeof body.modelVersion !== 'string'
    ) {
      return {
        status: 400,
        body: { error: 'Sandy tool call requires toolName, input, modelId, and modelVersion' },
      }
    }

    const result = invokeSandyTool(state, {
      patientId,
      voiceSessionId,
      toolName: body.toolName,
      input: body.input,
      modelId: body.modelId,
      modelVersion: body.modelVersion,
    })
    await store.save(result.state)

    return { status: statusForToolResult(result.toolResult), body: result.toolResult }
  }

  if (method === 'POST' && url.pathname === '/api/safety/model-backstop/status') {
    if (!isRecord(body) || !isModelBackstopStatus(body.status)) {
      return { status: 400, body: { error: 'Model backstop status requires available, degraded, or unavailable' } }
    }

    const updated = recordModelBackstopHealth(state, {
      status: body.status,
      detail: typeof body.detail === 'string' ? body.detail : 'No detail supplied.',
    })
    await store.save(updated)
    return { status: 200, body: { ok: true, opsAlerts: updated.data.opsAlerts } satisfies OpsAlertResponse }
  }

  if (method === 'GET' && url.pathname === '/api/ops/alerts') {
    return { status: 200, body: state.data.opsAlerts }
  }

  if (
    method === 'POST' &&
    segments[0] === 'api' &&
    segments[1] === 'navigator' &&
    segments[2] === 'queue' &&
    segments[4] === 'complete'
  ) {
    if (!isRecord(body) || typeof body.reviewer !== 'string') {
      return { status: 400, body: { error: 'Navigator completion requires reviewer' } }
    }

    const itemId = segments[3] ?? ''
    const updated = completeNavigatorTask(state, itemId, body.reviewer)
    await store.save(updated)
    const completed = updated.data.navigatorQueue.find((item) => item.id === itemId)

    return completed
      ? { status: 200, body: completed }
      : { status: 404, body: { error: 'Navigator queue item not found' } }
  }

  if (method === 'GET' && url.pathname === '/api/audit') {
    return { status: 200, body: state.auditEvents }
  }

  return { status: 404, body: { error: 'Route not found' } }
}
