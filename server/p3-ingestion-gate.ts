import { HERO_ID } from '../src/data/seed'
import { runH2AsyncAccessGate } from './async-access-gate'
import { runH3Part2Gate } from './part2-gate'
import { ingestPatientAccessClaims, patientAccessClaimsSourceIds } from './p3-ingestion-rail'
import { createInitialBackendState } from './state'

export interface P3IngestionGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface P3IngestionGateReport {
  cases: P3IngestionGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

const CLAIM_FACT = {
  label: 'Medication fill',
  value: 'Metformin 500 mg filled for 30 days',
  effectiveDate: '2026-06-15',
  fhirRef: 'MedicationDispense/ext_ruth_metformin_fill',
}

function claimsInput(overrides: Record<string, unknown> = {}) {
  return {
    sourceId: 'kentucky_mco_patient_access',
    patientId: HERO_ID,
    candidateDateOfBirth: '1974-03-14',
    candidateStrongIdentifier: { kind: 'payer_member_id' as const, value: 'KY-MCO-123' },
    externalRecordId: 'ext_ruth_mco_claims',
    matchMethod: 'deterministic' as const,
    matchConfidence: 1,
    strongIdentifier: { kind: 'payer_member_id' as const, value: 'KY-MCO-123' },
    externalName: 'Ruth A. Caldwell',
    externalDateOfBirth: '1974-03-14',
    patientConfirmed: false,
    facts: [CLAIM_FACT],
    ...overrides,
  }
}

export function runP3IngestionGate(): P3IngestionGateReport {
  const sourceRegistryOk = patientAccessClaimsSourceIds().join(',') ===
    'medicare_blue_button_2,kentucky_mco_patient_access'
  const state = createInitialBackendState()
  const withoutConsent = {
    ...state,
    data: {
      ...state.data,
      consents: state.data.consents.map((consent) =>
        consent.patientId === HERO_ID ? { ...consent, status: 'revoked' as const } : consent,
      ),
    },
  }
  const consentBlocked = ingestPatientAccessClaims(withoutConsent, claimsInput())
  const accepted = ingestPatientAccessClaims(state, claimsInput())
  const wrongPatient = ingestPatientAccessClaims(
    state,
    claimsInput({
      externalRecordId: 'ext_wrong_patient_claims',
      externalName: 'Marla Baker',
      externalDateOfBirth: '1968-10-03',
    }),
  )
  const asyncGate = runH2AsyncAccessGate()
  const part2Gate = runH3Part2Gate()
  const cases: P3IngestionGateCase[] = [
    {
      id: 'p3_source_registry_present',
      ok: sourceRegistryOk,
      detail: `claimsSources=${patientAccessClaimsSourceIds().join(',')}`,
    },
    {
      id: 'consent_required_for_patient_access_claims',
      ok: consentBlocked.status === 'consent_blocked' && consentBlocked.acceptedSourceFacts.length === 0,
      detail: consentBlocked.status,
    },
    {
      id: 'corroborated_claims_land_with_fhir_provenance',
      ok:
        accepted.status === 'accepted' &&
        accepted.acceptedSourceFacts.length === 1 &&
        accepted.acceptedSourceFacts.every((fact) => fact.fhirRef && fact.sourceName.includes('Patient Access')),
      detail: accepted.status,
    },
    {
      id: 'wrong_patient_claims_held_for_identity_review',
      ok: wrongPatient.status === 'identity_review' && wrongPatient.acceptedSourceFacts.length === 0,
      detail: wrongPatient.status,
    },
    {
      id: 'async_access_gate_composed',
      ok: asyncGate.summary.ok,
      detail: `${asyncGate.summary.passed}/${asyncGate.summary.total}`,
    },
    {
      id: 'part2_gate_composed',
      ok: part2Gate.summary.ok,
      detail: `${part2Gate.summary.passed}/${part2Gate.summary.total}`,
    },
  ]
  const passed = cases.filter((testCase) => testCase.ok).length

  return {
    cases,
    summary: {
      ok: passed === cases.length,
      passed,
      total: cases.length,
    },
  }
}
