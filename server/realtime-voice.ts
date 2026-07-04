import { createHash } from 'node:crypto'
import { sandyRealtimeToolSchemas } from '../src/lib/sandy-tools'
import type { BackendState } from './types'

export type RealtimeVoiceBlockReason =
  | 'flag_off'
  | 'missing_api_key'
  | 'patient_not_found'
  | 'open_red_flag'
  | 'provider_error'
  | 'invalid_provider_response'

export interface RealtimeVoiceRuntimeOptions {
  env?: Record<string, string | undefined>
  fetch?: typeof fetch
}

export interface RealtimeVoiceClientSecret {
  value: string
  expiresAt?: number
}

export interface RealtimeVoiceClientSecretSuccess {
  ok: true
  status: 200
  provider: 'openai_realtime'
  patientId: string
  model: string
  safetyIdentifier: string
  clientSecret: RealtimeVoiceClientSecret
}

export interface RealtimeVoiceClientSecretBlocked {
  ok: false
  status: 403 | 404 | 409 | 502 | 503
  reason: RealtimeVoiceBlockReason
  error: string
}

export type RealtimeVoiceClientSecretResult =
  | RealtimeVoiceClientSecretSuccess
  | RealtimeVoiceClientSecretBlocked

const OPENAI_REALTIME_CLIENT_SECRET_URL = 'https://api.openai.com/v1/realtime/client_secrets'
const DEFAULT_REALTIME_MODEL = 'gpt-realtime-2'
const DEFAULT_REALTIME_VOICE = 'marin'
const SANDY_REALTIME_INSTRUCTIONS =
  'You are Sandy for the RHTP retinopathy protocol. Stay inside the approved protocol, cite source facts only through server tools, do not diagnose, do not change medication, and stop routine coaching for red flags.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function envValue(options: RealtimeVoiceRuntimeOptions, key: string): string | undefined {
  return options.env ? options.env[key] : process.env[key]
}

function flagEnabled(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'TRUE' || value === 'on' || value === 'yes'
}

function openRedFlagExists(state: BackendState, patientId: string): boolean {
  return state.data.redFlagEvents.some((event) => event.patientId === patientId && event.status === 'open')
}

function extractClientSecret(payload: unknown): RealtimeVoiceClientSecret | null {
  if (!isRecord(payload)) return null

  if (typeof payload.value === 'string') {
    return {
      value: payload.value,
      expiresAt: typeof payload.expires_at === 'number' ? payload.expires_at : undefined,
    }
  }

  const nested = payload.client_secret
  if (isRecord(nested) && typeof nested.value === 'string') {
    return {
      value: nested.value,
      expiresAt: typeof nested.expires_at === 'number' ? nested.expires_at : undefined,
    }
  }

  return null
}

export function buildVoiceSafetyIdentifier(patientId: string, salt = 'rhtp-demo-voice-safety'): string {
  const digest = createHash('sha256').update(`${salt}:${patientId}`).digest('hex').slice(0, 32)
  return `rhtp_voice_${digest}`
}

export async function createRealtimeVoiceClientSecret(
  state: BackendState,
  patientId: string,
  options: RealtimeVoiceRuntimeOptions = {},
): Promise<RealtimeVoiceClientSecretResult> {
  if (!flagEnabled(envValue(options, 'RHTP_REAL_VOICE'))) {
    return {
      ok: false,
      status: 403,
      reason: 'flag_off',
      error: 'Real voice is disabled by RHTP_REAL_VOICE',
    }
  }

  const patient = state.data.patients.find((candidate) => candidate.id === patientId)
  if (!patient) {
    return {
      ok: false,
      status: 404,
      reason: 'patient_not_found',
      error: 'Patient not found',
    }
  }

  if (openRedFlagExists(state, patientId)) {
    return {
      ok: false,
      status: 409,
      reason: 'open_red_flag',
      error: 'Routine real voice cannot start while an urgent red flag is open',
    }
  }

  const apiKey = envValue(options, 'OPENAI_API_KEY')
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      reason: 'missing_api_key',
      error: 'Real voice cannot start until OPENAI_API_KEY is configured on the server',
    }
  }

  const model = envValue(options, 'RHTP_REAL_VOICE_MODEL') ?? DEFAULT_REALTIME_MODEL
  const voice = envValue(options, 'RHTP_REAL_VOICE_OUTPUT_VOICE') ?? DEFAULT_REALTIME_VOICE
  const salt = envValue(options, 'RHTP_SAFETY_IDENTIFIER_SALT') ?? undefined
  const safetyIdentifier = buildVoiceSafetyIdentifier(patientId, salt)
  const fetcher = options.fetch ?? fetch
  const form = new FormData()
  form.set(
    'session',
    JSON.stringify({
      session: {
        type: 'realtime',
        model,
        instructions: SANDY_REALTIME_INSTRUCTIONS,
        audio: { output: { voice } },
        tools: sandyRealtimeToolSchemas(),
      },
    }),
  )

  const response = await fetcher(OPENAI_REALTIME_CLIENT_SECRET_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'OpenAI-Safety-Identifier': safetyIdentifier,
    },
    body: form,
  })

  if (!response.ok) {
    return {
      ok: false,
      status: 502,
      reason: 'provider_error',
      error: `OpenAI Realtime session mint failed with HTTP ${response.status}`,
    }
  }

  const payload = (await response.json()) as unknown
  const clientSecret = extractClientSecret(payload)
  if (!clientSecret) {
    return {
      ok: false,
      status: 502,
      reason: 'invalid_provider_response',
      error: 'OpenAI Realtime session response did not include a client secret',
    }
  }

  return {
    ok: true,
    status: 200,
    provider: 'openai_realtime',
    patientId,
    model,
    safetyIdentifier,
    clientSecret,
  }
}
