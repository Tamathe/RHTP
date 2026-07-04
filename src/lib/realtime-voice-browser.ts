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
  stop: () => void
}

export interface RealtimeVoiceFailedSession {
  status: 'blocked' | 'failed'
  reason: string
  message: string
}

export type RealtimeVoiceStartResult = RealtimeVoiceConnectedSession | RealtimeVoiceFailedSession

interface ClientSecretPayload {
  clientSecret?: {
    value?: string
  }
  error?: string
  reason?: string
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

function stopTracks(tracks: RealtimeVoiceTrack[]): void {
  for (const track of tracks) {
    track.stop()
  }
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
  const clientSecret = payload.clientSecret?.value
  if (!clientSecret) {
    return {
      status: 'failed',
      reason: 'missing_client_secret',
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

  peerConnection.createDataChannel('oai-events')

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
    stop: () => {
      stopTracks(tracks)
      peerConnection.close()
    },
  }
}
