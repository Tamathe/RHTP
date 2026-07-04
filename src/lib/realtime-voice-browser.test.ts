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
    const dataChannel = createFakeDataChannel()
    const peerConnection = createFakePeerConnection(dataChannel)
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
            voiceSessionId: 'voice_browser_test',
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
    expect(result).toEqual(expect.objectContaining({ voiceSessionId: 'voice_browser_test' }))
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

    dataChannel.emit({
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: 'Why do I need this?',
    })
    dataChannel.emit({
      type: 'response.output_audio_transcript.done',
      transcript: 'I can explain the screening gap.',
    })
    await Promise.resolve()
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: `/api/voice/${HERO_ID}/realtime-session/voice_browser_test/transcript`,
          body: JSON.stringify({
            speaker: 'patient',
            text: 'Why do I need this?',
            safety: 'normal',
            classifierLabels: [],
          }),
        }),
        expect.objectContaining({
          url: `/api/voice/${HERO_ID}/realtime-session/voice_browser_test/transcript`,
          body: JSON.stringify({
            speaker: 'sandy',
            text: 'I can explain the screening gap.',
            safety: 'normal',
            classifierLabels: [],
          }),
        }),
      ]),
    )
  })

  it('stops local media when the realtime SDP exchange fails', async () => {
    const localTrack = { stopped: false, stop: () => (localTrack.stopped = true) }
    const peerConnection = createFakePeerConnection()
    const fetcher: typeof fetch = async (input) => {
      if (String(input).endsWith('/realtime-session')) {
        return new Response(JSON.stringify({ voiceSessionId: 'voice_browser_test', clientSecret: { value: 'ek_browser_test' } }), {
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

  it('routes Realtime function calls through the Sandy tool gateway', async () => {
    const calls: { url: string; body?: unknown }[] = []
    const dataChannel = createFakeDataChannel()
    const peerConnection = createFakePeerConnection(dataChannel)
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input)
      calls.push({ url, body: init?.body })

      if (url === `/api/voice/${HERO_ID}/realtime-session`) {
        return new Response(
          JSON.stringify({
            ok: true,
            provider: 'openai_realtime',
            model: 'gpt-realtime-2',
            voiceSessionId: 'voice_browser_test',
            clientSecret: { value: 'ek_browser_test', expiresAt: 12345 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }

      if (url === `/api/voice/${HERO_ID}/realtime-session/voice_browser_test/tool`) {
        return new Response(
          JSON.stringify({
            ok: true,
            toolName: 'answer_education',
            emittedEventId: 'proto_tool_answer',
            message: 'Sandy may answer this retinopathy education question using approved context.',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }

      return new Response('answer-sdp', { status: 200, headers: { 'content-type': 'application/sdp' } })
    }

    await startRealtimeVoiceSession({
      patientId: HERO_ID,
      fetch: fetcher,
      createPeerConnection: () => peerConnection,
      getUserMedia: async () => ({
        getTracks: () => [{ stop: () => undefined }],
      }),
      createAudioElement: () => ({ autoplay: false, srcObject: null }),
    })

    dataChannel.emit({
      type: 'response.done',
      response: {
        output: [
          {
            type: 'function_call',
            name: 'answer_education',
            call_id: 'call_answer',
            arguments: '{"question":"Why do I need this screening?"}',
          },
        ],
      },
    })
    await Promise.resolve()
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: `/api/voice/${HERO_ID}/realtime-session/voice_browser_test/tool`,
          body: JSON.stringify({
            toolName: 'answer_education',
            input: { question: 'Why do I need this screening?' },
            modelId: 'openai_realtime',
            modelVersion: 'gpt-realtime-2',
          }),
        }),
      ]),
    )
    expect(dataChannel.sent.map((payload) => JSON.parse(payload) as unknown)).toEqual([
      {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: 'call_answer',
          output: JSON.stringify({
            ok: true,
            toolName: 'answer_education',
            emittedEventId: 'proto_tool_answer',
            message: 'Sandy may answer this retinopathy education question using approved context.',
          }),
        },
      },
      { type: 'response.create' },
    ])
  })

  it('closes the peer connection when microphone access is unavailable', async () => {
    const peerConnection = createFakePeerConnection()
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify({ voiceSessionId: 'voice_browser_test', clientSecret: { value: 'ek_browser_test' } }), {
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

function createFakeDataChannel() {
  let listener: ((event: { data: string }) => void) | undefined
  return {
    sent: [] as string[],
    send(data: string) {
      this.sent.push(data)
    },
    close: () => undefined,
    addEventListener(event: string, handler: (event: { data: string }) => void) {
      if (event === 'message') listener = handler
    },
    emit(payload: unknown) {
      listener?.({ data: JSON.stringify(payload) })
    },
  }
}

function createFakePeerConnection(dataChannel = createFakeDataChannel()) {
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
      return dataChannel
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
