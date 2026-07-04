import { HERO_ID } from '../src/data/seed'
import type { IdentityMatchDecision } from '../src/lib/identity-corroboration'
import {
  ingestClaimsFacts,
  recordIdentityCorroboration,
  type IngestClaimsFactsInput,
  type RecordIdentityCorroborationInput,
} from './actions'
import { createInitialBackendState } from './state'

export interface E2IdentityGateCase {
  id: string
  ok: boolean
  decision: IdentityMatchDecision
  autonomousOutreachAllowed: boolean
  queueCreated: boolean
  protocolEventsAdded: number
  auditRecorded: boolean
}

export interface E2IdentityGateReport {
  cases: E2IdentityGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
    wrongPatientAutonomousOutreachBlocked: boolean
  }
}

const BASE_INPUT = {
  patientId: HERO_ID,
  candidateDateOfBirth: '1974-03-14',
  candidateStrongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
  externalSystem: 'kentucky_mco',
  matchMethod: 'deterministic',
  matchConfidence: 1,
  strongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
} satisfies Omit<
  RecordIdentityCorroborationInput,
  'externalRecordId' | 'externalName' | 'externalDateOfBirth' | 'patientConfirmed'
>

function runCase(
  id: string,
  input: RecordIdentityCorroborationInput,
  expected: Pick<E2IdentityGateCase, 'decision' | 'autonomousOutreachAllowed' | 'queueCreated'>,
): E2IdentityGateCase {
  const state = createInitialBackendState()
  const result = recordIdentityCorroboration(state, input)
  const queueCreated = result.state.data.navigatorQueue.length > state.data.navigatorQueue.length
  const protocolEventsAdded = result.state.data.protocolEvents.length - state.data.protocolEvents.length
  const auditRecorded = result.state.auditEvents.some((event) => event.action === 'identity_corroboration_checked')
  const ok =
    result.corroboration.decision === expected.decision &&
    result.corroboration.autonomousOutreachAllowed === expected.autonomousOutreachAllowed &&
    queueCreated === expected.queueCreated &&
    protocolEventsAdded === 0 &&
    auditRecorded

  return {
    id,
    ok,
    decision: result.corroboration.decision,
    autonomousOutreachAllowed: result.corroboration.autonomousOutreachAllowed,
    queueCreated,
    protocolEventsAdded,
    auditRecorded,
  }
}

function runIngestCase(
  id: string,
  input: IngestClaimsFactsInput,
  expected: Pick<E2IdentityGateCase, 'decision' | 'autonomousOutreachAllowed' | 'queueCreated'> & {
    factsAccepted: boolean
  },
): E2IdentityGateCase {
  const state = createInitialBackendState()
  const result = ingestClaimsFacts(state, input)
  const queueCreated = result.state.data.navigatorQueue.length > state.data.navigatorQueue.length
  const protocolEventsAdded = result.state.data.protocolEvents.length - state.data.protocolEvents.length
  const auditRecorded = result.state.auditEvents.some(
    (event) => event.action === 'claims_ingest_completed' || event.action === 'claims_ingest_held_for_identity_review',
  )
  const factsAccepted = result.acceptedSourceFacts.length > 0
  const ok =
    result.identityDecision === expected.decision &&
    result.autonomousOutreachAllowed === expected.autonomousOutreachAllowed &&
    queueCreated === expected.queueCreated &&
    factsAccepted === expected.factsAccepted &&
    protocolEventsAdded === 0 &&
    auditRecorded

  return {
    id,
    ok,
    decision: result.identityDecision,
    autonomousOutreachAllowed: result.autonomousOutreachAllowed,
    queueCreated,
    protocolEventsAdded,
    auditRecorded,
  }
}

export function runE2IdentityGate(): E2IdentityGateReport {
  const cases = [
    runCase(
      'strong_id_only_wrong_patient',
      {
        ...BASE_INPUT,
        externalRecordId: 'ext_wrong_patient',
        externalName: 'Marla Baker',
        externalDateOfBirth: '1968-10-03',
        patientConfirmed: false,
      },
      { decision: 'navigator_review', autonomousOutreachAllowed: false, queueCreated: true },
    ),
    runCase(
      'corroborated_pre_confirmation',
      {
        ...BASE_INPUT,
        externalRecordId: 'ext_ruth_pre_confirmation',
        externalName: 'Ruth A. Caldwell',
        externalDateOfBirth: '1974-03-14',
        patientConfirmed: false,
      },
      { decision: 'auto_link', autonomousOutreachAllowed: false, queueCreated: false },
    ),
    runCase(
      'corroborated_after_confirmation',
      {
        ...BASE_INPUT,
        externalRecordId: 'ext_ruth_confirmed',
        externalName: 'Ruth Ann Caldwell',
        externalDateOfBirth: '1974-03-14',
        patientConfirmed: true,
      },
      { decision: 'auto_link', autonomousOutreachAllowed: true, queueCreated: false },
    ),
    runCase(
      'probabilistic_match_review',
      {
        patientId: HERO_ID,
        candidateDateOfBirth: '1974-03-14',
        externalSystem: 'kentucky_mco',
        externalRecordId: 'ext_probable',
        matchMethod: 'probabilistic',
        matchConfidence: 0.88,
        externalName: 'Ruth Caldwell',
        externalDateOfBirth: '1974-03-14',
        patientConfirmed: false,
      },
      { decision: 'navigator_review', autonomousOutreachAllowed: false, queueCreated: true },
    ),
    runIngestCase(
      'claims_ingest_wrong_patient_held',
      {
        ...BASE_INPUT,
        externalRecordId: 'ext_wrong_patient_claims',
        externalName: 'Marla Baker',
        externalDateOfBirth: '1968-10-03',
        patientConfirmed: false,
        sourceName: 'Kentucky Medicaid MCO Patient Access',
        facts: [
          {
            label: 'Retinal screening gap',
            value: 'No retinal screening claim found in the last 12 months',
            effectiveDate: '2026-06-30',
            fhirRef: 'CoverageEligibilityResponse/ext_wrong_patient_gap',
          },
        ],
      },
      {
        decision: 'navigator_review',
        autonomousOutreachAllowed: false,
        queueCreated: true,
        factsAccepted: false,
      },
    ),
    runIngestCase(
      'claims_ingest_pre_confirmation_not_outreach_driving',
      {
        ...BASE_INPUT,
        externalRecordId: 'ext_ruth_claims_pre_confirmation',
        externalName: 'Ruth A. Caldwell',
        externalDateOfBirth: '1974-03-14',
        patientConfirmed: false,
        sourceName: 'Kentucky Medicaid MCO Patient Access',
        facts: [
          {
            label: 'Retinal screening gap',
            value: 'No retinal screening claim found in the last 12 months',
            effectiveDate: '2026-06-30',
            fhirRef: 'CoverageEligibilityResponse/ext_ruth_gap',
          },
        ],
      },
      {
        decision: 'auto_link',
        autonomousOutreachAllowed: false,
        queueCreated: false,
        factsAccepted: true,
      },
    ),
  ]
  const passed = cases.filter((testCase) => testCase.ok).length
  const wrongPatientCase = cases.find((testCase) => testCase.id === 'strong_id_only_wrong_patient')

  return {
    cases,
    summary: {
      ok: passed === cases.length,
      passed,
      total: cases.length,
      wrongPatientAutonomousOutreachBlocked:
        wrongPatientCase?.decision === 'navigator_review' && wrongPatientCase.autonomousOutreachAllowed === false,
    },
  }
}
