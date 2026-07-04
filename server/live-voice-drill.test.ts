import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import { runLiveVoiceDrill } from './live-voice-drill'
import { createInitialBackendState } from './state'

describe('live Realtime voice drill preflight', () => {
  it('reports missing live prerequisites without calling the provider', async () => {
    let providerCalls = 0
    const report = await runLiveVoiceDrill(createInitialBackendState(), {
      patientId: HERO_ID,
      env: {},
      fetch: async () => {
        providerCalls += 1
        return new Response('{}', { status: 200 })
      },
    })

    expect(report.status).toBe('blocked')
    expect(report.missingPrerequisites).toEqual([
      'RHTP_REAL_VOICE=1',
      'NEXT_PUBLIC_RHTP_REAL_VOICE=1 or VITE_RHTP_REAL_VOICE=1',
      'OPENAI_API_KEY',
    ])
    expect(report.providerMint).toEqual({ attempted: false })
    expect(report.liveAudio).toEqual({
      measured: false,
      reason: 'Browser microphone/WebRTC journey must be run manually in a no-PHI environment.',
    })
    expect(providerCalls).toBe(0)
  })

  it('marks preflight ready without minting a provider session by default', async () => {
    let providerCalls = 0
    const report = await runLiveVoiceDrill(createInitialBackendState(), {
      patientId: HERO_ID,
      env: {
        RHTP_REAL_VOICE: '1',
        NEXT_PUBLIC_RHTP_REAL_VOICE: '1',
        OPENAI_API_KEY: 'sk_live_test',
      },
      fetch: async () => {
        providerCalls += 1
        return new Response('{}', { status: 200 })
      },
    })

    expect(report.status).toBe('ready_for_browser_drill')
    expect(report.missingPrerequisites).toEqual([])
    expect(report.providerMint).toEqual({ attempted: false })
    expect(providerCalls).toBe(0)
  })

  it('optionally measures the live provider client-secret mint without exposing secrets', async () => {
    const report = await runLiveVoiceDrill(createInitialBackendState(), {
      patientId: HERO_ID,
      allowProviderMint: true,
      nowMs: (() => {
        let current = 100
        return () => {
          current += 37
          return current
        }
      })(),
      env: {
        RHTP_REAL_VOICE: '1',
        VITE_RHTP_REAL_VOICE: '1',
        OPENAI_API_KEY: 'sk_live_test',
        RHTP_REAL_VOICE_MODEL: 'gpt-realtime-2',
      },
      fetch: async () =>
        new Response(JSON.stringify({ client_secret: { value: 'ek_live_secret', expires_at: 98765 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    })

    expect(report.status).toBe('provider_mint_measured')
    expect(report.providerMint).toEqual({
      attempted: true,
      ok: true,
      latencyMs: 37,
      model: 'gpt-realtime-2',
      clientSecretReturned: true,
    })
    expect(JSON.stringify(report)).not.toContain('sk_live_test')
    expect(JSON.stringify(report)).not.toContain('ek_live_secret')
  })
})
