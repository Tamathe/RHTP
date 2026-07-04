import { createRealtimeVoiceClientSecret } from './realtime-voice'
import type { BackendState } from './types'

export type LiveVoiceDrillStatus = 'blocked' | 'ready_for_browser_drill' | 'provider_mint_measured'

export interface LiveVoiceDrillOptions {
  patientId: string
  env?: Record<string, string | undefined>
  fetch?: typeof fetch
  allowProviderMint?: boolean
  nowMs?: () => number
}

export interface LiveVoiceDrillReport {
  status: LiveVoiceDrillStatus
  missingPrerequisites: string[]
  providerMint:
    | { attempted: false }
    | {
        attempted: true
        ok: true
        latencyMs: number
        model: string
        clientSecretReturned: boolean
      }
    | {
        attempted: true
        ok: false
        latencyMs: number
        reason: string
        error: string
      }
  liveAudio: {
    measured: false
    reason: string
  }
}

function flagEnabled(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'TRUE' || value === 'on' || value === 'yes'
}

function envValue(options: LiveVoiceDrillOptions, key: string): string | undefined {
  return options.env ? options.env[key] : process.env[key]
}

function missingPrerequisites(options: LiveVoiceDrillOptions): string[] {
  const missing: string[] = []
  if (!flagEnabled(envValue(options, 'RHTP_REAL_VOICE'))) {
    missing.push('RHTP_REAL_VOICE=1')
  }
  if (
    !flagEnabled(envValue(options, 'NEXT_PUBLIC_RHTP_REAL_VOICE')) &&
    !flagEnabled(envValue(options, 'VITE_RHTP_REAL_VOICE'))
  ) {
    missing.push('NEXT_PUBLIC_RHTP_REAL_VOICE=1 or VITE_RHTP_REAL_VOICE=1')
  }
  if (!envValue(options, 'OPENAI_API_KEY')) {
    missing.push('OPENAI_API_KEY')
  }

  return missing
}

function liveAudioUnmeasured(): LiveVoiceDrillReport['liveAudio'] {
  return {
    measured: false,
    reason: 'Browser microphone/WebRTC journey must be run manually in a no-PHI environment.',
  }
}

export async function runLiveVoiceDrill(
  state: BackendState,
  options: LiveVoiceDrillOptions,
): Promise<LiveVoiceDrillReport> {
  const missing = missingPrerequisites(options)
  if (missing.length > 0) {
    return {
      status: 'blocked',
      missingPrerequisites: missing,
      providerMint: { attempted: false },
      liveAudio: liveAudioUnmeasured(),
    }
  }

  if (!options.allowProviderMint) {
    return {
      status: 'ready_for_browser_drill',
      missingPrerequisites: [],
      providerMint: { attempted: false },
      liveAudio: liveAudioUnmeasured(),
    }
  }

  const nowMs = options.nowMs ?? performance.now.bind(performance)
  const start = nowMs()
  const result = await createRealtimeVoiceClientSecret(state, options.patientId, {
    env: options.env,
    fetch: options.fetch,
  })
  const latencyMs = Number((nowMs() - start).toFixed(3))

  if (!result.ok) {
    return {
      status: 'blocked',
      missingPrerequisites: [],
      providerMint: {
        attempted: true,
        ok: false,
        latencyMs,
        reason: result.reason,
        error: result.error,
      },
      liveAudio: liveAudioUnmeasured(),
    }
  }

  return {
    status: 'provider_mint_measured',
    missingPrerequisites: [],
    providerMint: {
      attempted: true,
      ok: true,
      latencyMs,
      model: result.model,
      clientSecretReturned: Boolean(result.clientSecret.value),
    },
    liveAudio: liveAudioUnmeasured(),
  }
}
