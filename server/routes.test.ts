import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import { handleApiRequest } from './routes'
import { createInitialBackendState } from './state'
import type { BackendState, StateStore } from './types'

interface ContextResponseBody {
  navigatorQueue: { id: string; reason: string }[]
  voiceTurns: { speaker: string }[]
}

function createMemoryStore(initial: BackendState = createInitialBackendState()): StateStore {
  let state = initial

  return {
    async load() {
      return state
    },
    async save(next) {
      state = next
    },
    async reset() {
      state = createInitialBackendState()
      return state
    },
  }
}

describe('handleApiRequest', () => {
  it('returns health without touching patient state', async () => {
    const response = await handleApiRequest(createMemoryStore(), 'GET', '/api/health')

    expect(response).toEqual({ status: 200, body: { ok: true, service: 'rhtp-backend' } })
  })

  it('returns minimum trusted context for a patient', async () => {
    const response = await handleApiRequest(createMemoryStore(), 'GET', `/api/patients/${HERO_ID}/context`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.objectContaining({
        patient: expect.objectContaining({ id: HERO_ID }),
        consent: expect.objectContaining({ status: 'active' }),
        sourceFacts: expect.arrayContaining([expect.objectContaining({ sourceKind: 'claims' })]),
      }),
    )
  })

  it('starts voice outreach and returns updated patient context', async () => {
    const store = createMemoryStore()
    const response = await handleApiRequest(store, 'POST', `/api/voice/${HERO_ID}/start`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.objectContaining({
        voiceTurns: expect.arrayContaining([expect.objectContaining({ speaker: 'sandy' })]),
      }),
    )
  })

  it('records voice reply and exposes navigator queue work', async () => {
    const store = createMemoryStore()
    await handleApiRequest(store, 'POST', `/api/voice/${HERO_ID}/reply`, { text: 'I need a ride' })
    const response = await handleApiRequest(store, 'GET', '/api/navigator/queue')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason: 'transportation_barrier' })]),
    )
  })

  it('completes navigator queue work and exposes audit events', async () => {
    const store = createMemoryStore()
    const reply = await handleApiRequest(store, 'POST', `/api/voice/${HERO_ID}/reply`, {
      text: 'Already completed',
    })
    const replyBody = reply.body as ContextResponseBody
    const itemId = replyBody.navigatorQueue.at(-1)?.id
    if (!itemId) throw new Error('Expected queued item')

    const completed = await handleApiRequest(store, 'POST', `/api/navigator/queue/${itemId}/complete`, {
      reviewer: 'nav_dana',
    })
    const audit = await handleApiRequest(store, 'GET', '/api/audit')

    expect(completed.status).toBe(200)
    expect(completed.body).toEqual(expect.objectContaining({ status: 'done' }))
    expect(audit.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'navigator_queue_completed' })]),
    )
  })

  it('returns typed errors for unknown routes and invalid payloads', async () => {
    expect(await handleApiRequest(createMemoryStore(), 'GET', '/api/nope')).toEqual({
      status: 404,
      body: { error: 'Route not found' },
    })

    expect(await handleApiRequest(createMemoryStore(), 'POST', `/api/voice/${HERO_ID}/reply`, {})).toEqual({
      status: 400,
      body: { error: 'Voice reply requires text' },
    })
  })
})
