import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import { buildVoiceSafetyIdentifier, createRealtimeVoiceClientSecret } from './realtime-voice'
import { createInitialBackendState } from './state'

describe('createRealtimeVoiceClientSecret', () => {
  it('blocks realtime voice when RHTP_REAL_VOICE is off', async () => {
    const result = await createRealtimeVoiceClientSecret(createInitialBackendState(), HERO_ID, {
      env: { RHTP_REAL_VOICE: '0' },
    })

    expect(result).toEqual({
      ok: false,
      status: 403,
      reason: 'flag_off',
      error: 'Real voice is disabled by RHTP_REAL_VOICE',
    })
  })

  it('blocks realtime voice when the server OpenAI key is missing', async () => {
    const result = await createRealtimeVoiceClientSecret(createInitialBackendState(), HERO_ID, {
      env: { RHTP_REAL_VOICE: '1' },
    })

    expect(result).toEqual({
      ok: false,
      status: 503,
      reason: 'missing_api_key',
      error: 'Real voice cannot start until OPENAI_API_KEY is configured on the server',
    })
  })

  it('mints an OpenAI Realtime client secret with minimal protocol context', async () => {
    let capturedRequest:
      | {
          url: string
          authorization: string | null
          safetyIdentifier: string | null
          session: unknown
        }
      | undefined
    const fetcher: typeof fetch = async (input, init) => {
      if (!(init?.body instanceof FormData)) {
        throw new Error('Expected FormData body')
      }

      const sessionPayload = init.body.get('session')
      if (typeof sessionPayload !== 'string') {
        throw new Error('Expected string session payload')
      }

      const headers = new Headers(init.headers)
      capturedRequest = {
        url: String(input),
        authorization: headers.get('authorization'),
        safetyIdentifier: headers.get('openai-safety-identifier'),
        session: JSON.parse(sessionPayload) as unknown,
      }

      return new Response(JSON.stringify({ value: 'ek_realtime_test', expires_at: 12345 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const result = await createRealtimeVoiceClientSecret(createInitialBackendState(), HERO_ID, {
      env: {
        OPENAI_API_KEY: 'sk_server_secret',
        RHTP_REAL_VOICE: '1',
        RHTP_REAL_VOICE_MODEL: 'gpt-realtime-2',
      },
      fetch: fetcher,
    })

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        status: 200,
        provider: 'openai_realtime',
        model: 'gpt-realtime-2',
        clientSecret: { value: 'ek_realtime_test', expiresAt: 12345 },
      }),
    )
    expect(capturedRequest).toEqual(
      expect.objectContaining({
        url: 'https://api.openai.com/v1/realtime/client_secrets',
        authorization: 'Bearer sk_server_secret',
        safetyIdentifier: buildVoiceSafetyIdentifier(HERO_ID),
      }),
    )
    expect(capturedRequest?.session).toEqual({
      session: {
        type: 'realtime',
        model: 'gpt-realtime-2',
        instructions:
          'You are Sandy for the RHTP retinopathy protocol. Stay inside the approved protocol, cite source facts only through server tools, do not diagnose, do not change medication, and stop routine coaching for red flags.',
        audio: { output: { voice: 'marin' } },
      },
    })
    expect(JSON.stringify(result)).not.toContain('sk_server_secret')
    expect(JSON.stringify(capturedRequest?.session)).not.toContain('Ruth Ann Caldwell')
    expect(JSON.stringify(capturedRequest?.session)).not.toContain('8.4')
  })
})
