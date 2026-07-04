import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../data/seed'
import { isRealtimeVoiceClientEnabled, startRealtimeVoiceSession } from './realtime-voice-browser'

describe('isRealtimeVoiceClientEnabled', () => {
  it('keeps browser realtime voice off by default', () => {
    expect(isRealtimeVoiceClientEnabled({})).toBe(false)
  })

  it('accepts the ledger client flag and the Vite local alias', () => {
    expect(isRealtimeVoiceClientEnabled({ NEXT_PUBLIC_RHTP_REAL_VOICE: '1' })).toBe(true)
    expect(isRealtimeVoiceClientEnabled({ VITE_RHTP_REAL_VOICE: 'true' })).toBe(true)
  })
})

describe('startRealtimeVoiceSession', () => {
  it('connects browser audio through a backend-minted realtime client secret', async () => {
    const calls: { url: string; authorization?: string; contentType?: string; body?: unknown }[] = []
    const localTrack = { stopped: false, stop: () => (localTrack.stopped = true) }
    const peerConnection = createFakePeerConnection()
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      calls.push({
        url,
        authorization: headers.get('authorization') ?? undefined,
        contentType: headers.get('content-type') ?? undefined,
        body: init?.body,
      })

      if (url === `/api/voice/${HERO_ID}/realtime-session`) {
        return new Response(
          JSON.stringify({
            ok: true,
            provider: 'openai_realtime',
            model: 'gpt-realtime-2',
            clientSecret: { value: 'ek_browser_test', expiresAt: 12345 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }

      return new Response('answer-sdp', { status: 200, headers: { 'content-type': 'application/sdp' } })
    }

    const result = await startRealtimeVoiceSession({
      patientId: HERO_ID,
      fetch: fetcher,
      createPeerConnection: () => peerConnection,
      getUserMedia: async () => ({
        getTracks: () => [localTrack],
      }),
      createAudioElement: () => ({ autoplay: false, srcObject: null }),
    })

    expect(result.status).toBe('connected')
    expect(calls).toEqual([
      expect.objectContaining({
        url: `/api/voice/${HERO_ID}/realtime-session`,
      }),
      expect.objectContaining({
        url: 'https://api.openai.com/v1/realtime/calls',
        authorization: 'Bearer ek_browser_test',
        contentType: 'application/sdp',
        body: 'offer-sdp',
      }),
    ])
    expect(peerConnection.addedTracks).toEqual([localTrack])
    expect(peerConnection.dataChannelLabel).toBe('oai-events')
    expect(peerConnection.remoteDescription).toEqual({ type: 'answer', sdp: 'answer-sdp' })
    expect(localTrack.stopped).toBe(false)
  })

  it('stops local media when the realtime SDP exchange fails', async () => {
    const localTrack = { stopped: false, stop: () => (localTrack.stopped = true) }
    const peerConnection = createFakePeerConnection()
    const fetcher: typeof fetch = async (input) => {
      if (String(input).endsWith('/realtime-session')) {
        return new Response(JSON.stringify({ clientSecret: { value: 'ek_browser_test' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }

      return new Response('provider unavailable', { status: 503 })
    }

    const result = await startRealtimeVoiceSession({
      patientId: HERO_ID,
      fetch: fetcher,
      createPeerConnection: () => peerConnection,
      getUserMedia: async () => ({
        getTracks: () => [localTrack],
      }),
      createAudioElement: () => ({ autoplay: false, srcObject: null }),
    })

    expect(result).toEqual({
      status: 'failed',
      reason: 'realtime_exchange_failed',
      message: 'Realtime voice could not connect.',
    })
    expect(localTrack.stopped).toBe(true)
    expect(peerConnection.closed).toBe(true)
  })

  it('closes the peer connection when microphone access is unavailable', async () => {
    const peerConnection = createFakePeerConnection()
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify({ clientSecret: { value: 'ek_browser_test' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })

    const result = await startRealtimeVoiceSession({
      patientId: HERO_ID,
      fetch: fetcher,
      createPeerConnection: () => peerConnection,
      getUserMedia: async () => {
        throw new Error('microphone denied')
      },
      createAudioElement: () => ({ autoplay: false, srcObject: null }),
    })

    expect(result).toEqual({
      status: 'failed',
      reason: 'microphone_unavailable',
      message: 'Microphone access is not available.',
    })
    expect(peerConnection.closed).toBe(true)
  })
})

function createFakePeerConnection() {
  return {
    addedTracks: [] as unknown[],
    closed: false,
    dataChannelLabel: '',
    remoteDescription: undefined as unknown,
    ontrack: null,
    addTrack(track: unknown) {
      this.addedTracks.push(track)
    },
    createDataChannel(label: string) {
      this.dataChannelLabel = label
      return { send: () => undefined, close: () => undefined }
    },
    async createOffer() {
      return { type: 'offer' as const, sdp: 'offer-sdp' }
    },
    async setLocalDescription() {
      return undefined
    },
    async setRemoteDescription(description: unknown) {
      this.remoteDescription = description
    },
    close() {
      this.closed = true
    },
  }
}
