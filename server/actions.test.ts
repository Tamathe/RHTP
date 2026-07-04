import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import {
  completeNavigatorTask,
  ingestClaimsFacts,
  invokeSandyTool,
  recordIdentityCorroboration,
  recordModelBackstopHealth,
  recordRealtimeTranscriptSegment,
  recordRealtimeVoiceSessionStarted,
  recordVoiceReply,
  startVoiceSession,
} from './actions'
import { createInitialBackendState } from './state'

describe('backend protocol actions', () => {
  it('starts a Sandy voice session with a protocol event and audit event', () => {
    const updated = startVoiceSession(createInitialBackendState(), HERO_ID)

    expect(updated.data.voiceTurns.at(-1)?.speaker).toBe('sandy')
    expect(updated.data.protocolEvents.at(-1)).toEqual(
      expect.objectContaining({
        patientId: HERO_ID,
        type: 'sandy_explained_gap',
        status: 'explained',
      }),
    )
    expect(updated.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ action: 'voice_session_started', outcome: 'allowed' }),
    )
  })

  it('records a patient transportation barrier and creates navigator queue work', () => {
    const started = startVoiceSession(createInitialBackendState(), HERO_ID)
    const updated = recordVoiceReply(started, { patientId: HERO_ID, text: 'I need a ride' })

    expect(updated.data.barriers.at(-1)).toEqual(
      expect.objectContaining({
        patientId: HERO_ID,
        type: 'transportation',
        reportedVia: 'voice_api',
      }),
    )
    expect(updated.data.navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({
        reason: 'transportation_barrier',
        priority: 'routine',
        status: 'open',
      }),
    )
    expect(updated.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ action: 'voice_reply_recorded', outcome: 'allowed' }),
    )
  })

  it('blocks routine coaching after a red-flag symptom and creates urgent navigator work', () => {
    const redFlagged = recordVoiceReply(createInitialBackendState(), {
      patientId: HERO_ID,
      text: 'I have sudden vision changes',
    })
    const locked = startVoiceSession(redFlagged, HERO_ID)

    expect(redFlagged.data.navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({ reason: 'red_flag_symptom', priority: 'urgent' }),
    )
    expect(locked.data.voiceTurns.at(-1)?.text).toMatch(/cannot continue routine coaching/i)
    expect(locked.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ action: 'voice_session_started', outcome: 'blocked' }),
    )
  })

  it('hard-locks model-backstop-only hits and creates a rule-gap ticket', () => {
    const updated = recordVoiceReply(createInitialBackendState(), {
      patientId: HERO_ID,
      text: 'The future feels impossible',
      modelBackstopMatched: true,
      modelBackstopLabel: 'suicidal_ideation',
    })

    expect(updated.data.navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({ reason: 'red_flag_symptom', priority: 'urgent' }),
    )
    expect(updated.data.ruleGapTickets.at(-1)).toEqual(
      expect.objectContaining({
        patientId: HERO_ID,
        source: 'model_backstop',
        modelBackstopLabel: 'suicidal_ideation',
        status: 'open',
      }),
    )
    expect(updated.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ action: 'voice_reply_recorded', outcome: 'allowed' }),
    )
  })

  it('records an ops alert when the model backstop is degraded', () => {
    const updated = recordModelBackstopHealth(createInitialBackendState(), {
      status: 'degraded',
      detail: 'Realtime safety backstop timeout rate above threshold',
    })

    expect(updated.data.opsAlerts.at(-1)).toEqual(
      expect.objectContaining({
        type: 'model_backstop_degraded',
        status: 'open',
        severity: 'warning',
      }),
    )
    expect(updated.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ actor: 'system', action: 'model_backstop_health_recorded' }),
    )
  })

  it('creates a durable realtime voice session with protocol and audit provenance', () => {
    const updated = recordRealtimeVoiceSessionStarted(createInitialBackendState(), {
      patientId: HERO_ID,
      model: 'gpt-realtime-2',
      safetyIdentifier: 'rhtp_voice_hash',
    })

    expect(updated.data.voiceSessions.at(-1)).toEqual(
      expect.objectContaining({
        patientId: HERO_ID,
        packId: 'retinopathy',
        channel: 'voice',
        realtimeModelId: 'gpt-realtime-2',
        safetyIdentifier: 'rhtp_voice_hash',
        status: 'active',
      }),
    )
    expect(updated.data.protocolEvents.at(-1)).toEqual(
      expect.objectContaining({
        patientId: HERO_ID,
        type: 'sandy_explained_gap',
        actor: 'sandy',
      }),
    )
    expect(updated.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ action: 'realtime_voice_client_secret_minted', outcome: 'allowed' }),
    )
  })

  it('records completed realtime transcript segments against a voice session', () => {
    const withSession = recordRealtimeVoiceSessionStarted(createInitialBackendState(), {
      patientId: HERO_ID,
      model: 'gpt-realtime-2',
      safetyIdentifier: 'rhtp_voice_hash',
    })
    const voiceSessionId = withSession.data.voiceSessions.at(-1)?.id
    if (!voiceSessionId) throw new Error('Expected voice session')

    const updated = recordRealtimeTranscriptSegment(withSession, {
      voiceSessionId,
      speaker: 'patient',
      text: 'Why do I need this?',
      safety: 'normal',
      classifierLabels: ['education_question'],
    })

    expect(updated.data.transcriptSegments.at(-1)).toEqual(
      expect.objectContaining({
        voiceSessionId,
        speaker: 'patient',
        text: 'Why do I need this?',
        safety: 'normal',
        classifierLabels: ['education_question'],
      }),
    )
    expect(updated.auditEvents.at(-1)).toEqual(
      expect.objectContaining({
        actor: 'system',
        action: 'realtime_transcript_segment_recorded',
        outcome: 'allowed',
      }),
    )
  })

  it('allows an authorized Sandy education tool through the gateway with model provenance', () => {
    const withSession = recordRealtimeVoiceSessionStarted(createInitialBackendState(), {
      patientId: HERO_ID,
      model: 'gpt-realtime-2',
      safetyIdentifier: 'rhtp_voice_hash',
    })
    const voiceSessionId = withSession.data.voiceSessions.at(-1)?.id
    if (!voiceSessionId) throw new Error('Expected voice session')

    const result = invokeSandyTool(withSession, {
      patientId: HERO_ID,
      voiceSessionId,
      toolName: 'answer_education',
      input: { question: 'Why do I need this screening?' },
      modelId: 'openai_realtime',
      modelVersion: 'gpt-realtime-2',
    })

    expect(result.toolResult).toEqual(
      expect.objectContaining({
        ok: true,
        toolName: 'answer_education',
        emittedEventId: expect.stringMatching(/^proto_/),
      }),
    )
    expect(result.state.data.toolCalls.at(-1)).toEqual(
      expect.objectContaining({
        voiceSessionId,
        patientId: HERO_ID,
        packId: 'retinopathy',
        toolName: 'answer_education',
        decision: 'allowed',
        modelId: 'openai_realtime',
        modelVersion: 'gpt-realtime-2',
      }),
    )
    expect(result.state.data.protocolEvents.at(-1)).toEqual(
      expect.objectContaining({ type: 'question_answered', actor: 'sandy' }),
    )
    expect(result.state.auditEvents.at(-1)).toEqual(
      expect.objectContaining({
        action: 'sandy_tool_called',
        outcome: 'allowed',
        modelId: 'openai_realtime',
        modelVersion: 'gpt-realtime-2',
        sessionId: voiceSessionId,
        toolName: 'answer_education',
        packId: 'retinopathy',
      }),
    )
  })

  it('blocks Sandy tools that are not authorized by the pack', () => {
    const withSession = recordRealtimeVoiceSessionStarted(createInitialBackendState(), {
      patientId: HERO_ID,
      model: 'gpt-realtime-2',
      safetyIdentifier: 'rhtp_voice_hash',
    })
    const voiceSessionId = withSession.data.voiceSessions.at(-1)?.id
    if (!voiceSessionId) throw new Error('Expected voice session')

    const result = invokeSandyTool(withSession, {
      patientId: HERO_ID,
      voiceSessionId,
      toolName: 'change_medication',
      input: { medication: 'insulin' },
      modelId: 'openai_realtime',
      modelVersion: 'gpt-realtime-2',
    })

    expect(result.toolResult).toEqual({
      ok: false,
      toolName: 'change_medication',
      refusalReason: 'pack_not_authorized',
      message: 'Sandy cannot use that tool for this protocol pack.',
    })
    expect(result.state.data.toolCalls.at(-1)).toEqual(
      expect.objectContaining({
        toolName: 'change_medication',
        decision: 'blocked',
      }),
    )
    expect(result.state.data.protocolEvents).toHaveLength(withSession.data.protocolEvents.length)
    expect(result.state.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ action: 'sandy_tool_called', outcome: 'blocked' }),
    )
  })

  it('blocks Sandy tool calls while a red-flag lock is open', () => {
    const redFlagged = recordVoiceReply(createInitialBackendState(), {
      patientId: HERO_ID,
      text: 'I have sudden vision changes',
    })
    const withSession = recordRealtimeVoiceSessionStarted(redFlagged, {
      patientId: HERO_ID,
      model: 'gpt-realtime-2',
      safetyIdentifier: 'rhtp_voice_hash',
    })
    const voiceSessionId = withSession.data.voiceSessions.at(-1)?.id
    if (!voiceSessionId) throw new Error('Expected voice session')

    const result = invokeSandyTool(withSession, {
      patientId: HERO_ID,
      voiceSessionId,
      toolName: 'answer_education',
      input: { question: 'Can you keep coaching me?' },
      modelId: 'openai_realtime',
      modelVersion: 'gpt-realtime-2',
    })

    expect(result.toolResult).toEqual({
      ok: false,
      toolName: 'answer_education',
      refusalReason: 'red_flag_lock',
      message:
        'A navigator must review the urgent concern before Sandy can continue routine coaching.',
    })
    expect(result.state.data.toolCalls.at(-1)).toEqual(
      expect.objectContaining({ toolName: 'answer_education', decision: 'blocked' }),
    )
    expect(result.state.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ action: 'sandy_tool_called', outcome: 'blocked' }),
    )
  })

  it('lets a navigator complete returned work with review provenance', () => {
    const queued = recordVoiceReply(createInitialBackendState(), {
      patientId: HERO_ID,
      text: 'Already completed',
    })
    const itemId = queued.data.navigatorQueue.at(-1)?.id
    if (!itemId) throw new Error('Expected queued item')

    const updated = completeNavigatorTask(queued, itemId, 'nav_dana')

    expect(updated.data.navigatorQueue.find((item) => item.id === itemId)?.status).toBe('done')
    expect(updated.data.protocolEvents.at(-1)).toEqual(
      expect.objectContaining({ type: 'navigator_reviewed', actor: 'navigator' }),
    )
    expect(updated.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ actor: 'navigator', action: 'navigator_queue_completed' }),
    )
  })

  it('downgrades strong-ID-only identity matches without emitting outreach-driving events', () => {
    const state = createInitialBackendState()
    const result = recordIdentityCorroboration(state, {
      patientId: HERO_ID,
      candidateDateOfBirth: '1974-03-14',
      candidateStrongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      externalSystem: 'kentucky_mco',
      externalRecordId: 'ext_wrong_patient',
      matchMethod: 'deterministic',
      matchConfidence: 1,
      strongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      externalName: 'Marla Baker',
      externalDateOfBirth: '1968-10-03',
      patientConfirmed: false,
    })

    expect(result.corroboration.decision).toBe('navigator_review')
    expect(result.corroboration.autonomousOutreachAllowed).toBe(false)
    expect(result.state.data.protocolEvents).toHaveLength(state.data.protocolEvents.length)
    expect(result.state.data.navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({
        patientId: HERO_ID,
        reason: 'identity_match_review',
        priority: 'soon',
        status: 'open',
      }),
    )
    expect(result.state.auditEvents.at(-1)).toEqual(
      expect.objectContaining({
        actor: 'system',
        action: 'identity_corroboration_checked',
        outcome: 'blocked',
        patientId: HERO_ID,
      }),
    )
  })

  it('holds claims facts when identity cannot be corroborated', () => {
    const state = createInitialBackendState()
    const result = ingestClaimsFacts(state, {
      patientId: HERO_ID,
      candidateDateOfBirth: '1974-03-14',
      candidateStrongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      externalSystem: 'kentucky_mco',
      externalRecordId: 'ext_wrong_patient',
      matchMethod: 'deterministic',
      matchConfidence: 1,
      strongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      externalName: 'Marla Baker',
      externalDateOfBirth: '1968-10-03',
      patientConfirmed: false,
      sourceName: 'Kentucky Medicaid MCO Patient Access',
      facts: [
        {
          label: 'Retinal screening gap',
          value: 'No retinal screening claim found in the last 12 months',
          effectiveDate: '2026-06-30',
          fhirRef: 'CoverageEligibilityResponse/ext_wrong_patient_gap',
        },
      ],
    })

    expect(result.identityDecision).toBe('navigator_review')
    expect(result.acceptedSourceFacts).toEqual([])
    expect(result.state.data.sourceFacts).toHaveLength(state.data.sourceFacts.length)
    expect(result.state.data.patientIdentities).toHaveLength(state.data.patientIdentities.length)
    expect(result.state.data.protocolEvents).toHaveLength(state.data.protocolEvents.length)
    expect(result.state.data.navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({ reason: 'identity_match_review', priority: 'soon' }),
    )
  })

  it('lands corroborated claims facts as unconfirmed and non-outreach-driving', () => {
    const state = createInitialBackendState()
    const result = ingestClaimsFacts(state, {
      patientId: HERO_ID,
      candidateDateOfBirth: '1974-03-14',
      candidateStrongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      externalSystem: 'kentucky_mco',
      externalRecordId: 'ext_ruth_pre_confirmation',
      matchMethod: 'deterministic',
      matchConfidence: 1,
      strongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      externalName: 'Ruth A. Caldwell',
      externalDateOfBirth: '1974-03-14',
      patientConfirmed: false,
      sourceName: 'Kentucky Medicaid MCO Patient Access',
      facts: [
        {
          label: 'Retinal screening gap',
          value: 'No retinal screening claim found in the last 12 months',
          effectiveDate: '2026-06-30',
          fhirRef: 'CoverageEligibilityResponse/ext_ruth_gap',
        },
      ],
    })

    expect(result.identityDecision).toBe('auto_link')
    expect(result.autonomousOutreachAllowed).toBe(false)
    expect(result.state.data.patientIdentities.at(-1)).toEqual(
      expect.objectContaining({
        patientId: HERO_ID,
        externalSystem: 'kentucky_mco',
        externalId: 'ext_ruth_pre_confirmation',
        confirmedByPatient: false,
      }),
    )
    expect(result.acceptedSourceFacts).toEqual([
      expect.objectContaining({
        patientId: HERO_ID,
        label: 'Retinal screening gap',
        sourceKind: 'claims',
        confidence: 'confirmed',
        patientConfirmed: false,
        navigatorOverridden: false,
        fhirRef: 'CoverageEligibilityResponse/ext_ruth_gap',
      }),
    ])
    expect(result.state.data.protocolEvents).toHaveLength(state.data.protocolEvents.length)
  })
})
