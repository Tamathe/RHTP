import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import { handleApiRequest } from './routes'
import { createInitialBackendState } from './state'
import type { BackendState, StateStore } from './types'

interface ContextResponseBody {
  navigatorQueue: { id: string; reason: string }[]
  voiceTurns: { speaker: string }[]
  ruleGapTickets?: { id: string }[]
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

  it('records model-backstop-only safety hits and exposes rule-gap tickets in context', async () => {
    const store = createMemoryStore()
    const response = await handleApiRequest(store, 'POST', `/api/voice/${HERO_ID}/reply`, {
      text: 'The future feels impossible',
      modelBackstopMatched: true,
      modelBackstopLabel: 'suicidal_ideation',
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.objectContaining({
        navigatorQueue: expect.arrayContaining([expect.objectContaining({ reason: 'red_flag_symptom' })]),
        ruleGapTickets: expect.arrayContaining([
          expect.objectContaining({ modelBackstopLabel: 'suicidal_ideation', status: 'open' }),
        ]),
      }),
    )
  })

  it('records degraded model-backstop ops alerts', async () => {
    const response = await handleApiRequest(createMemoryStore(), 'POST', '/api/safety/model-backstop/status', {
      status: 'degraded',
      detail: 'timeout rate high',
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.objectContaining({
        opsAlerts: expect.arrayContaining([
          expect.objectContaining({ type: 'model_backstop_degraded', status: 'open' }),
        ]),
      }),
    )
  })

  it('refuses realtime voice sessions while the server flag is off', async () => {
    const response = await handleApiRequest(
      createMemoryStore(),
      'POST',
      `/api/voice/${HERO_ID}/realtime-session`,
      undefined,
      { env: { RHTP_REAL_VOICE: '0' } },
    )

    expect(response).toEqual({
      status: 403,
      body: {
        error: 'Real voice is disabled by RHTP_REAL_VOICE',
        reason: 'flag_off',
      },
    })
  })

  it('records an ops alert when realtime voice is enabled without server credentials', async () => {
    const store = createMemoryStore()
    const response = await handleApiRequest(
      store,
      'POST',
      `/api/voice/${HERO_ID}/realtime-session`,
      undefined,
      { env: { RHTP_REAL_VOICE: '1' } },
    )
    const alerts = await handleApiRequest(store, 'GET', '/api/ops/alerts')

    expect(response).toEqual({
      status: 503,
      body: {
        error: 'Real voice cannot start until OPENAI_API_KEY is configured on the server',
        reason: 'missing_api_key',
      },
    })
    expect(alerts.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'real_voice_config_blocked',
          severity: 'critical',
          status: 'open',
        }),
      ]),
    )
  })

  it('returns a sanitized realtime voice client secret when the flag and server key are present', async () => {
    const store = createMemoryStore()
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify({ client_secret: { value: 'ek_route_test', expires_at: 98765 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })

    const response = await handleApiRequest(
      store,
      'POST',
      `/api/voice/${HERO_ID}/realtime-session`,
      undefined,
      {
        env: {
          OPENAI_API_KEY: 'sk_route_secret',
          RHTP_REAL_VOICE: '1',
        },
        fetch: fetcher,
      },
    )
    const audit = await handleApiRequest(store, 'GET', '/api/audit')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        provider: 'openai_realtime',
        clientSecret: { value: 'ek_route_test', expiresAt: 98765 },
      }),
    )
    expect(JSON.stringify(response.body)).not.toContain('sk_route_secret')
    expect(audit.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'realtime_voice_client_secret_minted', outcome: 'allowed' }),
      ]),
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
