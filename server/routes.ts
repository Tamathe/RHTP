import type {
  NavigatorQueueItem,
  OpsAlert,
  Patient,
  PatientConsent,
  PatientIdentity,
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
  ingestClaimsFacts,
  invokeSandyTool,
  recordIdentityCorroboration,
  recordModelBackstopHealth,
  recordRealtimeTranscriptSegment,
  recordRealtimeVoiceSessionStarted,
  recordRealVoiceSessionIssue,
  recordVoiceReply,
  startVoiceSession,
  type ModelBackstopStatus,
} from './actions'
import type { IdentityMatchMethod, StrongIdentifier, StrongIdentifierKind } from '../src/lib/identity-corroboration'
import { createRealtimeVoiceClientSecret, type RealtimeVoiceRuntimeOptions } from './realtime-voice'
import type { BackendState, RouteResponse, StateStore } from './types'
import { appendAuditEvent } from './audit'
import {
  mintAsyncAccessToken,
  readAsyncPatientContext,
  revokeAsyncAccessToken,
} from './async-access'
import { ingestHieDischargeEvent } from './part2-suppression'
import { renderSmsMessage } from './sms-disclosure'

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
  patientIdentities: PatientIdentity[]
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

function isIdentityMatchMethod(value: unknown): value is IdentityMatchMethod {
  return value === 'deterministic' || value === 'probabilistic'
}

function isStrongIdentifierKind(value: unknown): value is StrongIdentifierKind {
  return value === 'payer_member_id' || value === 'beneficiary_id' || value === 'mpi_id'
}

function isStrongIdentifier(value: unknown): value is StrongIdentifier {
  return (
    isRecord(value) &&
    isStrongIdentifierKind(value.kind) &&
    typeof value.value === 'string' &&
    value.value.trim().length > 0
  )
}

function isClaimsFact(value: unknown): value is { label: string; value: string; effectiveDate: string; fhirRef?: string } {
  return (
    isRecord(value) &&
    typeof value.label === 'string' &&
    typeof value.value === 'string' &&
    typeof value.effectiveDate === 'string' &&
    (value.fhirRef === undefined || typeof value.fhirRef === 'string')
  )
}

function isConcretePackIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((packId) => typeof packId === 'string' && packId.trim().length > 0 && packId !== '*')
  )
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string')
}

function asyncDeniedStatus(reason: string): 403 | 404 {
  return reason === 'patient_not_found' ? 404 : 403
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
      patientIdentities: state.data.patientIdentities.filter((identity) => identity.patientId === patientId),
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

  if (method === 'POST' && segments[0] === 'api' && segments[1] === 'async' && segments[2] === 'access-token' && segments.length === 3) {
    if (
      !isRecord(body) ||
      typeof body.patientId !== 'string' ||
      body.patientId.trim().length === 0 ||
      body.patientId === '*' ||
      !isConcretePackIds(body.packIds) ||
      typeof body.purpose !== 'string' ||
      body.purpose.trim().length === 0 ||
      typeof body.ttlSeconds !== 'number' ||
      body.ttlSeconds <= 0 ||
      body.ttlSeconds > 900
    ) {
      return { status: 400, body: { error: 'Async access token requires one patient, concrete pack ids, purpose, and ttlSeconds <= 900' } }
    }

    if (!state.data.patients.some((patient) => patient.id === body.patientId)) {
      return { status: 404, body: { error: 'Patient not found' } }
    }

    const result = mintAsyncAccessToken(state, {
      patientId: body.patientId,
      packIds: body.packIds,
      purpose: body.purpose,
      ttlSeconds: body.ttlSeconds,
    })
    await store.save(result.state)

    return { status: 200, body: { ok: true, token: result.token } }
  }

  if (
    method === 'POST' &&
    segments[0] === 'api' &&
    segments[1] === 'async' &&
    segments[2] === 'access-token' &&
    segments[3] === 'revoke'
  ) {
    if (!isRecord(body) || typeof body.token !== 'string' || typeof body.reason !== 'string') {
      return { status: 400, body: { error: 'Async access token revoke requires token and reason' } }
    }

    const result = revokeAsyncAccessToken(state, {
      token: body.token,
      reason: body.reason,
    })
    await store.save(result.state)

    return result.ok
      ? { status: 200, body: { ok: true } }
      : { status: 404, body: { error: result.message, reason: result.reason } }
  }

  if (
    method === 'POST' &&
    segments[0] === 'api' &&
    segments[1] === 'async' &&
    segments[2] === 'patients' &&
    segments[4] === 'context'
  ) {
    if (!isRecord(body) || typeof body.token !== 'string' || typeof body.packId !== 'string') {
      return { status: 400, body: { error: 'Async patient context requires token and packId' } }
    }

    const result = readAsyncPatientContext(state, {
      token: body.token,
      patientId: segments[3] ?? '',
      packId: body.packId,
    })
    await store.save(result.state)

    return result.ok
      ? { status: 200, body: result.context }
      : {
          status: asyncDeniedStatus(result.reason),
          body: { error: result.message, reason: result.reason },
        }
  }

  if (method === 'GET' && segments[0] === 'api' && segments[1] === 'patients' && segments[3] === 'context') {
    return patientContext(state, segments[2] ?? '')
  }

  if (method === 'POST' && segments[0] === 'api' && segments[1] === 'ingest' && segments[2] === 'claims') {
    if (
      !isRecord(body) ||
      typeof body.patientId !== 'string' ||
      typeof body.externalSystem !== 'string' ||
      typeof body.externalRecordId !== 'string' ||
      !isIdentityMatchMethod(body.matchMethod) ||
      typeof body.matchConfidence !== 'number' ||
      typeof body.sourceName !== 'string' ||
      !Array.isArray(body.facts) ||
      body.facts.some((fact) => !isClaimsFact(fact)) ||
      (body.retrievedAt !== undefined && typeof body.retrievedAt !== 'string') ||
      (body.candidateDateOfBirth !== undefined && typeof body.candidateDateOfBirth !== 'string') ||
      (body.externalName !== undefined && typeof body.externalName !== 'string') ||
      (body.externalDateOfBirth !== undefined && typeof body.externalDateOfBirth !== 'string') ||
      (body.patientConfirmed !== undefined && typeof body.patientConfirmed !== 'boolean') ||
      (body.candidateStrongIdentifier !== undefined && !isStrongIdentifier(body.candidateStrongIdentifier)) ||
      (body.strongIdentifier !== undefined && !isStrongIdentifier(body.strongIdentifier))
    ) {
      return { status: 400, body: { error: 'Claims ingest requires typed identity evidence and facts' } }
    }

    if (!state.data.patients.some((patient) => patient.id === body.patientId)) {
      return { status: 404, body: { error: 'Patient not found' } }
    }

    const result = ingestClaimsFacts(state, {
      patientId: body.patientId,
      candidateDateOfBirth: body.candidateDateOfBirth,
      candidateStrongIdentifier: body.candidateStrongIdentifier,
      externalSystem: body.externalSystem,
      externalRecordId: body.externalRecordId,
      matchMethod: body.matchMethod,
      matchConfidence: body.matchConfidence,
      strongIdentifier: body.strongIdentifier,
      externalName: body.externalName,
      externalDateOfBirth: body.externalDateOfBirth,
      patientConfirmed: body.patientConfirmed,
      sourceName: body.sourceName,
      retrievedAt: body.retrievedAt,
      facts: body.facts,
    })
    await store.save(result.state)

    return {
      status: result.identityDecision === 'auto_link' ? 200 : 202,
      body: {
        ok: result.identityDecision === 'auto_link',
        identityDecision: result.identityDecision,
        acceptedSourceFactIds: result.acceptedSourceFacts.map((fact) => fact.id),
        autonomousOutreachAllowed: result.autonomousOutreachAllowed,
      },
    }
  }

  if (
    method === 'POST' &&
    segments[0] === 'api' &&
    segments[1] === 'ingest' &&
    segments[2] === 'hie' &&
    segments[3] === 'discharge'
  ) {
    if (
      !isRecord(body) ||
      typeof body.patientId !== 'string' ||
      typeof body.sourceName !== 'string' ||
      typeof body.facilityName !== 'string' ||
      typeof body.dischargeDisposition !== 'string' ||
      typeof body.effectiveDate !== 'string' ||
      typeof body.retrievedAt !== 'string' ||
      (body.fhirRef !== undefined && typeof body.fhirRef !== 'string')
    ) {
      return { status: 400, body: { error: 'HIE discharge ingest requires typed encounter evidence' } }
    }

    if (!state.data.patients.some((patient) => patient.id === body.patientId)) {
      return { status: 404, body: { error: 'Patient not found' } }
    }

    const result = ingestHieDischargeEvent(state, {
      patientId: body.patientId,
      sourceName: body.sourceName,
      facilityName: body.facilityName,
      dischargeDisposition: body.dischargeDisposition,
      effectiveDate: body.effectiveDate,
      retrievedAt: body.retrievedAt,
      fhirRef: body.fhirRef,
    })
    await store.save(result.state)

    return {
      status: result.decision === 'accepted' ? 200 : 202,
      body: {
        ok: result.decision === 'accepted',
        decision: result.decision,
        acceptedSourceFactId: result.acceptedSourceFact?.id ?? null,
      },
    }
  }

  if (
    method === 'POST' &&
    segments[0] === 'api' &&
    segments[1] === 'patients' &&
    segments[3] === 'identity' &&
    segments[4] === 'corroborate'
  ) {
    if (
      !isRecord(body) ||
      typeof body.externalSystem !== 'string' ||
      typeof body.externalRecordId !== 'string' ||
      !isIdentityMatchMethod(body.matchMethod) ||
      typeof body.matchConfidence !== 'number' ||
      (body.candidateDateOfBirth !== undefined && typeof body.candidateDateOfBirth !== 'string') ||
      (body.externalName !== undefined && typeof body.externalName !== 'string') ||
      (body.externalDateOfBirth !== undefined && typeof body.externalDateOfBirth !== 'string') ||
      (body.patientConfirmed !== undefined && typeof body.patientConfirmed !== 'boolean') ||
      (body.candidateStrongIdentifier !== undefined && !isStrongIdentifier(body.candidateStrongIdentifier)) ||
      (body.strongIdentifier !== undefined && !isStrongIdentifier(body.strongIdentifier))
    ) {
      return {
        status: 400,
        body: { error: 'Identity corroboration requires typed external match evidence' },
      }
    }

    const patientId = segments[2] ?? ''
    const result = recordIdentityCorroboration(state, {
      patientId,
      candidateDateOfBirth: body.candidateDateOfBirth,
      candidateStrongIdentifier: body.candidateStrongIdentifier,
      externalSystem: body.externalSystem,
      externalRecordId: body.externalRecordId,
      matchMethod: body.matchMethod,
      matchConfidence: body.matchConfidence,
      strongIdentifier: body.strongIdentifier,
      externalName: body.externalName,
      externalDateOfBirth: body.externalDateOfBirth,
      patientConfirmed: body.patientConfirmed,
    })
    await store.save(result.state)

    return {
      status: 200,
      body: {
        ok: true,
        decision: result.corroboration.decision,
        queueReason: result.corroboration.queueReason,
        autonomousOutreachAllowed: result.corroboration.autonomousOutreachAllowed,
        matchQuality: result.corroboration.matchQuality,
      },
    }
  }

  if (method === 'GET' && url.pathname === '/api/navigator/queue') {
    return { status: 200, body: navigatorQueue(state) }
  }

  if (
    method === 'POST' &&
    segments[0] === 'api' &&
    segments[1] === 'outreach' &&
    segments[2] === 'sms' &&
    segments[3] === 'render'
  ) {
    if (
      !isRecord(body) ||
      typeof body.patientId !== 'string' ||
      typeof body.templateId !== 'string' ||
      typeof body.language !== 'string' ||
      typeof body.category !== 'string' ||
      !isStringRecord(body.slots)
    ) {
      return { status: 400, body: { error: 'SMS render requires patientId, templateId, language, category, and slots' } }
    }

    if (!state.data.patients.some((patient) => patient.id === body.patientId)) {
      return { status: 404, body: { error: 'Patient not found' } }
    }

    const result = renderSmsMessage({
      templateId: body.templateId,
      language: body.language,
      category: body.category,
      slots: body.slots,
    })
    const audited = appendAuditEvent(state, {
      actor: 'system',
      action: 'sms_template_rendered',
      outcome: result.ok ? 'allowed' : 'blocked',
      patientId: body.patientId,
      detail: result.ok
        ? 'Approved disclosure-safe SMS template rendered.'
        : 'SMS render blocked by disclosure gate.',
    })
    await store.save(audited)

    return { status: result.ok ? 200 : 403, body: result }
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
