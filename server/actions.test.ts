import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import { completeNavigatorTask, recordVoiceReply, startVoiceSession } from './actions'
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
})
