import { HERO_ID } from '../data/seed'

export interface RealtimeVoiceEnv {
  NEXT_PUBLIC_RHTP_REAL_VOICE?: string
  VITE_RHTP_REAL_VOICE?: string
  VITE_RHTP_API_BASE_URL?: string
}

export interface RealtimeVoiceTrack {
  stop: () => void
}

export interface RealtimeVoiceMediaStream {
  getTracks: () => RealtimeVoiceTrack[]
}

export interface RealtimeVoiceDataChannel {
  send: (data: string) => void
  close: () => void
  addEventListener: (event: 'message', handler: (event: { data: string }) => void) => void
}

export interface RealtimeVoiceAudioElement {
  autoplay: boolean
  srcObject: unknown
}

export interface RealtimeVoicePeerConnection {
  ontrack: ((event: { streams: unknown[] }) => void) | null
  addTrack: (track: RealtimeVoiceTrack) => void
  createDataChannel: (label: string) => RealtimeVoiceDataChannel
  createOffer: () => Promise<RTCSessionDescriptionInit>
  setLocalDescription: (description: RTCSessionDescriptionInit) => Promise<void>
  setRemoteDescription: (description: RTCSessionDescriptionInit) => Promise<void>
  close: () => void
}

export interface StartRealtimeVoiceSessionInput {
  patientId?: string
  apiBaseUrl?: string
  env?: RealtimeVoiceEnv
  fetch?: typeof fetch
  createPeerConnection?: () => RealtimeVoicePeerConnection
  getUserMedia?: () => Promise<RealtimeVoiceMediaStream>
  createAudioElement?: () => RealtimeVoiceAudioElement
}

export interface RealtimeVoiceConnectedSession {
  status: 'connected'
  voiceSessionId: string
  stop: () => void
}

export interface RealtimeVoiceFailedSession {
  status: 'blocked' | 'failed'
  reason: string
  message: string
}

export type RealtimeVoiceStartResult = RealtimeVoiceConnectedSession | RealtimeVoiceFailedSession

interface ClientSecretPayload {
  provider?: string
  model?: string
  voiceSessionId?: string
  clientSecret?: {
    value?: string
  }
  error?: string
  reason?: string
}

interface RealtimeToolCall {
  name: string
  callId: string
  input: Record<string, unknown>
}

const REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls'

function flagEnabled(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'TRUE' || value === 'on' || value === 'yes'
}

function defaultPeerConnection(): RealtimeVoicePeerConnection {
  const peerConnection = new RTCPeerConnection()

  return {
    get ontrack() {
      return peerConnection.ontrack as ((event: { streams: unknown[] }) => void) | null
    },
    set ontrack(handler) {
      peerConnection.ontrack = handler as ((event: RTCTrackEvent) => void) | null
    },
    addTrack(track) {
      peerConnection.addTrack(track as MediaStreamTrack)
    },
    createDataChannel(label) {
      return peerConnection.createDataChannel(label)
    },
    createOffer() {
      return peerConnection.createOffer()
    },
    setLocalDescription(description) {
      return peerConnection.setLocalDescription(description)
    },
    setRemoteDescription(description) {
      return peerConnection.setRemoteDescription(description)
    },
    close() {
      peerConnection.close()
    },
  }
}

function defaultGetUserMedia(): Promise<RealtimeVoiceMediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true })
}

function defaultAudioElement(): RealtimeVoiceAudioElement {
  const audio = document.createElement('audio')
  audio.autoplay = true
  return audio
}

function sessionEndpoint(apiBaseUrl: string, patientId: string): string {
  const base = apiBaseUrl.replace(/\/$/, '')
  return `${base}/api/voice/${patientId}/realtime-session`
}

function transcriptEndpoint(apiBaseUrl: string, patientId: string, voiceSessionId: string): string {
  const base = apiBaseUrl.replace(/\/$/, '')
  return `${base}/api/voice/${patientId}/realtime-session/${voiceSessionId}/transcript`
}

function toolEndpoint(apiBaseUrl: string, patientId: string, voiceSessionId: string): string {
  const base = apiBaseUrl.replace(/\/$/, '')
  return `${base}/api/voice/${patientId}/realtime-session/${voiceSessionId}/tool`
}

function stopTracks(tracks: RealtimeVoiceTrack[]): void {
  for (const track of tracks) {
    track.stop()
  }
}

function transcriptSegmentFromRealtimeEvent(data: string): { speaker: 'patient' | 'sandy'; text: string } | null {
  try {
    const parsed = JSON.parse(data) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null

    const event = parsed as Record<string, unknown>
    if (
      event.type === 'conversation.item.input_audio_transcription.completed' &&
      typeof event.transcript === 'string'
    ) {
      return { speaker: 'patient', text: event.transcript }
    }

    if (event.type === 'response.output_audio_transcript.done' && typeof event.transcript === 'string') {
      return { speaker: 'sandy', text: event.transcript }
    }

    return null
  } catch {
    return null
  }
}

function parseToolArguments(argumentsPayload: unknown): Record<string, unknown> | null {
  if (typeof argumentsPayload !== 'string') return null

  try {
    const parsed = JSON.parse(argumentsPayload) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null

    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function toolCallsFromRealtimeEvent(data: string): RealtimeToolCall[] {
  try {
    const parsed = JSON.parse(data) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return []

    const event = parsed as Record<string, unknown>
    if (event.type === 'response.done') {
      const response = event.response
      if (typeof response !== 'object' || response === null || Array.isArray(response)) return []

      const output = (response as Record<string, unknown>).output
      if (!Array.isArray(output)) return []

      return output.flatMap((item): RealtimeToolCall[] => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) return []

        const candidate = item as Record<string, unknown>
        if (
          candidate.type !== 'function_call' ||
          typeof candidate.name !== 'string' ||
          typeof candidate.call_id !== 'string'
        ) {
          return []
        }

        const input = parseToolArguments(candidate.arguments)
        return input ? [{ name: candidate.name, callId: candidate.call_id, input }] : []
      })
    }

    if (event.type === 'response.function_call_arguments.done') {
      const item = event.item
      const itemRecord =
        typeof item === 'object' && item !== null && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : undefined
      const name =
        typeof event.name === 'string'
          ? event.name
          : typeof itemRecord?.name === 'string'
            ? itemRecord.name
            : undefined
      const callId =
        typeof event.call_id === 'string'
          ? event.call_id
          : typeof itemRecord?.call_id === 'string'
            ? itemRecord.call_id
            : undefined
      const argumentsPayload =
        typeof event.arguments === 'string' ? event.arguments : itemRecord?.arguments
      const input = parseToolArguments(argumentsPayload)

      return name && callId && input ? [{ name, callId, input }] : []
    }

    return []
  } catch {
    return []
  }
}

function persistTranscriptSegment(
  fetcher: typeof fetch,
  apiBaseUrl: string,
  patientId: string,
  voiceSessionId: string,
  segment: { speaker: 'patient' | 'sandy'; text: string },
): void {
  void fetcher(transcriptEndpoint(apiBaseUrl, patientId, voiceSessionId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      speaker: segment.speaker,
      text: segment.text,
      safety: 'normal',
      classifierLabels: [],
    }),
  })
}

async function invokeSandyToolGateway(
  fetcher: typeof fetch,
  apiBaseUrl: string,
  patientId: string,
  voiceSessionId: string,
  modelVersion: string,
  toolCall: RealtimeToolCall,
): Promise<unknown> {
  try {
    const response = await fetcher(toolEndpoint(apiBaseUrl, patientId, voiceSessionId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        toolName: toolCall.name,
        input: toolCall.input,
        modelId: 'openai_realtime',
        modelVersion,
      }),
    })

    return (await response.json().catch(() => ({
      ok: false,
      error: 'Sandy tool gateway returned a non-JSON response.',
    }))) as unknown
  } catch {
    return {
      ok: false,
      error: 'Sandy tool gateway could not be reached.',
    }
  }
}

async function handleRealtimeToolCall(
  dataChannel: RealtimeVoiceDataChannel,
  fetcher: typeof fetch,
  apiBaseUrl: string,
  patientId: string,
  voiceSessionId: string,
  modelVersion: string,
  toolCall: RealtimeToolCall,
): Promise<void> {
  const toolResult = await invokeSandyToolGateway(
    fetcher,
    apiBaseUrl,
    patientId,
    voiceSessionId,
    modelVersion,
    toolCall,
  )

  dataChannel.send(
    JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: toolCall.callId,
        output: JSON.stringify(toolResult),
      },
    }),
  )
  dataChannel.send(JSON.stringify({ type: 'response.create' }))
}

export function isRealtimeVoiceClientEnabled(env: RealtimeVoiceEnv = import.meta.env): boolean {
  return flagEnabled(env.NEXT_PUBLIC_RHTP_REAL_VOICE) || flagEnabled(env.VITE_RHTP_REAL_VOICE)
}

export async function startRealtimeVoiceSession(
  input: StartRealtimeVoiceSessionInput = {},
): Promise<RealtimeVoiceStartResult> {
  const patientId = input.patientId ?? HERO_ID
  const env = input.env ?? import.meta.env
  const fetcher = input.fetch ?? fetch
  const createPeerConnection = input.createPeerConnection ?? defaultPeerConnection
  const getUserMedia = input.getUserMedia ?? defaultGetUserMedia
  const createAudioElement = input.createAudioElement ?? defaultAudioElement
  const apiBaseUrl = input.apiBaseUrl ?? env.VITE_RHTP_API_BASE_URL ?? ''
  const tokenResponse = await fetcher(sessionEndpoint(apiBaseUrl, patientId), { method: 'POST' })

  if (!tokenResponse.ok) {
    const payload = (await tokenResponse.json().catch(() => ({}))) as ClientSecretPayload
    return {
      status: 'blocked',
      reason: payload.reason ?? 'session_gate_blocked',
      message: payload.error ?? 'Live voice is not available yet.',
    }
  }

  const payload = (await tokenResponse.json()) as ClientSecretPayload
  const modelVersion = payload.model ?? 'unknown_realtime_model'
  const clientSecret = payload.clientSecret?.value
  if (!clientSecret) {
    return {
      status: 'failed',
      reason: 'missing_client_secret',
      message: 'Realtime voice could not start.',
    }
  }
  const voiceSessionId = payload.voiceSessionId
  if (!voiceSessionId) {
    return {
      status: 'failed',
      reason: 'missing_voice_session',
      message: 'Realtime voice could not start.',
    }
  }

  const peerConnection = createPeerConnection()
  const audioElement = createAudioElement()
  let localStream: RealtimeVoiceMediaStream

  try {
    localStream = await getUserMedia()
  } catch {
    peerConnection.close()
    return {
      status: 'failed',
      reason: 'microphone_unavailable',
      message: 'Microphone access is not available.',
    }
  }

  const tracks = localStream.getTracks()

  audioElement.autoplay = true
  peerConnection.ontrack = (event) => {
    audioElement.srcObject = event.streams[0] ?? null
  }

  for (const track of tracks) {
    peerConnection.addTrack(track)
  }

  const dataChannel = peerConnection.createDataChannel('oai-events')
  dataChannel.addEventListener('message', (event) => {
    const segment = transcriptSegmentFromRealtimeEvent(event.data)
    if (segment) {
      persistTranscriptSegment(fetcher, apiBaseUrl, patientId, voiceSessionId, segment)
    }

    for (const toolCall of toolCallsFromRealtimeEvent(event.data)) {
      void handleRealtimeToolCall(
        dataChannel,
        fetcher,
        apiBaseUrl,
        patientId,
        voiceSessionId,
        modelVersion,
        toolCall,
      )
    }
  })

  const offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)

  const sdpResponse = await fetcher(REALTIME_CALLS_URL, {
    method: 'POST',
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${clientSecret}`,
      'Content-Type': 'application/sdp',
    },
  })

  if (!sdpResponse.ok) {
    stopTracks(tracks)
    peerConnection.close()
    return {
      status: 'failed',
      reason: 'realtime_exchange_failed',
      message: 'Realtime voice could not connect.',
    }
  }

  await peerConnection.setRemoteDescription({
    type: 'answer',
    sdp: await sdpResponse.text(),
  })

  return {
    status: 'connected',
    voiceSessionId,
    stop: () => {
      stopTracks(tracks)
      peerConnection.close()
    },
  }
}
