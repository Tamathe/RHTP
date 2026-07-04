import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import {
  ingestPatientAccessClaims,
  patientAccessClaimsSourceIds,
  p3DataSourceRegistry,
} from './p3-ingestion-rail'
import { createInitialBackendState } from './state'

const CLAIM_FACT = {
  label: 'Medication fill',
  value: 'Metformin 500 mg filled for 30 days',
  effectiveDate: '2026-06-15',
  fhirRef: 'MedicationDispense/ext_ruth_metformin_fill',
}

describe('P3 ingestion rail boundary', () => {
  it('registers the P3 source rows and default production decisions', () => {
    expect(p3DataSourceRegistry.map((source) => source.id)).toEqual([
      'medicare_blue_button_2',
      'kentucky_mco_patient_access',
      'khie_adt_subscription',
    ])
    expect(patientAccessClaimsSourceIds()).toEqual([
      'medicare_blue_button_2',
      'kentucky_mco_patient_access',
    ])
    expect(p3DataSourceRegistry.find((source) => source.id === 'kentucky_mco_patient_access')).toEqual(
      expect.objectContaining({
        kind: 'claims',
        mode: 'poll',
        trustTier: 2,
        consentPath: 'patient_oauth',
      }),
    )
  })

  it('lands corroborated patient-access claims through source registry, consent, identity, and FHIR refs', () => {
    const state = createInitialBackendState()
    const result = ingestPatientAccessClaims(state, {
      sourceId: 'kentucky_mco_patient_access',
      patientId: HERO_ID,
      candidateDateOfBirth: '1974-03-14',
      candidateStrongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      externalRecordId: 'ext_ruth_mco_claims',
      matchMethod: 'deterministic',
      matchConfidence: 1,
      strongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      externalName: 'Ruth A. Caldwell',
      externalDateOfBirth: '1974-03-14',
      patientConfirmed: false,
      facts: [CLAIM_FACT],
    })

    expect(result.status).toBe('accepted')
    expect(result.identityDecision).toBe('auto_link')
    expect(result.acceptedSourceFacts).toEqual([
      expect.objectContaining({
        sourceKind: 'claims',
        sourceName: 'Kentucky Medicaid MCO Patient Access API',
        fhirRef: CLAIM_FACT.fhirRef,
        patientConfirmed: false,
      }),
    ])
    expect(result.state.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'p3_patient_access_claims_ingested', outcome: 'allowed' }),
      ]),
    )
  })

  it('blocks claims before source facts when patient consent is missing', () => {
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
    const result = ingestPatientAccessClaims(withoutConsent, {
      sourceId: 'kentucky_mco_patient_access',
      patientId: HERO_ID,
      candidateDateOfBirth: '1974-03-14',
      candidateStrongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      externalRecordId: 'ext_ruth_mco_claims',
      matchMethod: 'deterministic',
      matchConfidence: 1,
      strongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      externalName: 'Ruth A. Caldwell',
      externalDateOfBirth: '1974-03-14',
      patientConfirmed: false,
      facts: [CLAIM_FACT],
    })

    expect(result).toEqual(
      expect.objectContaining({
        status: 'consent_blocked',
        acceptedSourceFacts: [],
      }),
    )
    expect(result.state.data.sourceFacts).toHaveLength(state.data.sourceFacts.length)
    expect(result.state.auditEvents.at(-1)).toEqual(
      expect.objectContaining({
        action: 'p3_patient_access_claims_blocked',
        outcome: 'blocked',
        patientId: HERO_ID,
      }),
    )
  })

  it('holds wrong-patient claims at identity review with no accepted source facts', () => {
    const state = createInitialBackendState()
    const result = ingestPatientAccessClaims(state, {
      sourceId: 'kentucky_mco_patient_access',
      patientId: HERO_ID,
      candidateDateOfBirth: '1974-03-14',
      candidateStrongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      externalRecordId: 'ext_wrong_patient_claims',
      matchMethod: 'deterministic',
      matchConfidence: 1,
      strongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      externalName: 'Marla Baker',
      externalDateOfBirth: '1968-10-03',
      patientConfirmed: false,
      facts: [CLAIM_FACT],
    })

    expect(result.status).toBe('identity_review')
    expect(result.identityDecision).toBe('navigator_review')
    expect(result.acceptedSourceFacts).toEqual([])
    expect(result.state.data.sourceFacts).toHaveLength(state.data.sourceFacts.length)
    expect(result.state.data.navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({ reason: 'identity_match_review' }),
    )
  })
})
