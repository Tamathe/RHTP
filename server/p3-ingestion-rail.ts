import { P3_DATA_SOURCES } from '../src/data/seed'
import type { DataSource, SourceFact } from '../src/types'
import { appendAuditEvent } from './audit'
import {
  ingestClaimsFacts,
  type ClaimsFactInput,
  type IngestClaimsFactsInput,
} from './actions'
import type { BackendState } from './types'

export const p3DataSourceRegistry: DataSource[] = P3_DATA_SOURCES

export interface PatientAccessClaimsInput
  extends Omit<IngestClaimsFactsInput, 'externalSystem' | 'sourceName'> {
  sourceId: string
}

export interface PatientAccessClaimsResult {
  state: BackendState
  status: 'accepted' | 'identity_review' | 'consent_blocked' | 'source_blocked' | 'fhir_ref_blocked'
  identityDecision?: 'auto_link' | 'navigator_review' | 'no_match'
  autonomousOutreachAllowed: boolean
  acceptedSourceFacts: SourceFact[]
}

function patientSourceFactIds(state: BackendState, patientId: string): string[] {
  return state.data.sourceFacts.filter((fact) => fact.patientId === patientId).map((fact) => fact.id)
}

function sourceById(state: BackendState, sourceId: string): DataSource | undefined {
  return state.data.dataSources.find((source) => source.id === sourceId)
}

function hasActiveConsent(state: BackendState, patientId: string): boolean {
  return state.data.consents.some((consent) => consent.patientId === patientId && consent.status === 'active')
}

function hasFhirRefs(facts: ClaimsFactInput[]): boolean {
  return facts.every((fact) => typeof fact.fhirRef === 'string' && fact.fhirRef.trim().length > 0)
}

export function patientAccessClaimsSourceIds(): string[] {
  return p3DataSourceRegistry.filter((source) => source.kind === 'claims').map((source) => source.id)
}

export function ingestPatientAccessClaims(
  state: BackendState,
  input: PatientAccessClaimsInput,
): PatientAccessClaimsResult {
  const source = sourceById(state, input.sourceId)

  if (!source || source.kind !== 'claims' || source.consentPath !== 'patient_oauth') {
    return {
      state: appendAuditEvent(state, {
        actor: 'system',
        action: 'p3_patient_access_claims_blocked',
        outcome: 'blocked',
        patientId: input.patientId,
        detail: 'Patient-access claims ingest blocked because the source is not registered for P3 claims.',
      }),
      status: 'source_blocked',
      autonomousOutreachAllowed: false,
      acceptedSourceFacts: [],
    }
  }

  if (!hasActiveConsent(state, input.patientId)) {
    return {
      state: appendAuditEvent(state, {
        actor: 'system',
        action: 'p3_patient_access_claims_blocked',
        outcome: 'blocked',
        patientId: input.patientId,
        detail: 'Patient-access claims ingest blocked because active patient consent is missing.',
      }),
      status: 'consent_blocked',
      autonomousOutreachAllowed: false,
      acceptedSourceFacts: [],
    }
  }

  if (!hasFhirRefs(input.facts)) {
    return {
      state: appendAuditEvent(state, {
        actor: 'system',
        action: 'p3_patient_access_claims_blocked',
        outcome: 'blocked',
        patientId: input.patientId,
        detail: 'Patient-access claims ingest blocked because every accepted fact must carry a FHIR reference.',
      }),
      status: 'fhir_ref_blocked',
      autonomousOutreachAllowed: false,
      acceptedSourceFacts: [],
    }
  }

  const result = ingestClaimsFacts(state, {
    ...input,
    externalSystem: source.id,
    sourceName: source.name,
  })

  if (result.identityDecision !== 'auto_link') {
    return {
      state: result.state,
      status: 'identity_review',
      identityDecision: result.identityDecision,
      autonomousOutreachAllowed: result.autonomousOutreachAllowed,
      acceptedSourceFacts: [],
    }
  }

  return {
    state: appendAuditEvent(result.state, {
      actor: 'system',
      action: 'p3_patient_access_claims_ingested',
      outcome: 'allowed',
      patientId: input.patientId,
      sourceIds: result.acceptedSourceFacts.map((fact) => fact.id),
      detail: `Patient-access claims ingest accepted from source=${source.id}; sourceFactBasis=${patientSourceFactIds(
        state,
        input.patientId,
      ).length}.`,
    }),
    status: 'accepted',
    identityDecision: result.identityDecision,
    autonomousOutreachAllowed: result.autonomousOutreachAllowed,
    acceptedSourceFacts: result.acceptedSourceFacts,
  }
}
