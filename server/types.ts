import type { SeedState } from '../src/data/seed'

export type AuditActor = 'patient' | 'sandy' | 'navigator' | 'system'
export type AuditOutcome = 'allowed' | 'blocked' | 'failed'

export interface AuditEvent {
  id: string
  createdAt: string
  actor: AuditActor
  action: string
  outcome: AuditOutcome
  patientId?: string
  sourceIds: string[]
  modelId?: string
  modelVersion?: string
  sessionId?: string
  toolName?: string
  packId?: string
  detail: string
}

export interface BackendState {
  schemaVersion: 1
  updatedAt: string
  data: SeedState
  auditEvents: AuditEvent[]
}

export interface StateStore {
  load: () => Promise<BackendState>
  save: (state: BackendState) => Promise<void>
  reset: () => Promise<BackendState>
}

export interface RouteResponse<T> {
  status: number
  body: T
}
