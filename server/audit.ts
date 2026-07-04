import type { AuditActor, AuditOutcome, BackendState } from './types'

interface AppendAuditEventInput {
  actor: AuditActor
  action: string
  outcome: AuditOutcome
  detail: string
  patientId?: string
  sourceIds?: string[]
}

let auditCounter = 0

const now = (): string => '2026-07-04T09:00:00'

export function appendAuditEvent(state: BackendState, input: AppendAuditEventInput): BackendState {
  return {
    ...state,
    updatedAt: now(),
    auditEvents: [
      ...state.auditEvents,
      {
        id: `audit_${++auditCounter}`,
        createdAt: now(),
        actor: input.actor,
        action: input.action,
        outcome: input.outcome,
        patientId: input.patientId,
        sourceIds: input.sourceIds ?? [],
        detail: input.detail,
      },
    ],
  }
}
