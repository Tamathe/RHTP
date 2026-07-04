import { nextProtocolStatus, priorityForQueueReason, queueReasonForBarrier } from '../src/lib/retinopathy-protocol'
import { screenPatientMessage } from '../src/lib/safety'
import type {
  BarrierType,
  NavigatorQueueReason,
  ProtocolActor,
  ProtocolEvent,
  ProtocolEventType,
  ProtocolStatus,
  ResultOutcome,
} from '../src/types'
import { appendAuditEvent } from './audit'
import type { BackendState } from './types'

export interface RecordVoiceReplyInput {
  patientId: string
  text: string
}

let actionCounter = 0

const now = (): string => '2026-07-04T09:00:00'

const RED_FLAG_LOCK_COPY =
  'A navigator already needs to review this urgent vision concern. Sandy cannot continue routine coaching until a human has helped.'

function nextId(prefix: string): string {
  actionCounter += 1
  return `${prefix}_${actionCounter}`
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

function hasOpenRedFlag(state: BackendState, patientId: string): boolean {
  return state.data.redFlagEvents.some((event) => event.patientId === patientId && event.status === 'open')
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

function barrierFromReply(text: string): BarrierType | null {
  if (/ride|transport/i.test(text)) return 'transportation'
  if (/cost|pay|insurance/i.test(text)) return 'cost'
  if (/after work|saturday|evening|weekend/i.test(text)) return 'after_hours'
  if (/already|done|completed/i.test(text)) return 'already_completed'
  if (/not ready|scared|afraid/i.test(text)) return 'not_ready'
  return null
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
  const screened = screenPatientMessage(input.text)
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
