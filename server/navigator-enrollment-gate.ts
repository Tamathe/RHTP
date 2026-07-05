import { navigatorEnrollmentIsPrototypeSafe } from '../src/lib/navigator-enrollment'
import { createInitialBackendState } from './state'

export interface NavigatorEnrollmentGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface NavigatorEnrollmentGateReport {
  cases: NavigatorEnrollmentGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

export function runNavigatorEnrollmentGate(): NavigatorEnrollmentGateReport {
  const state = createInitialBackendState()
  const session = state.data.navigatorEnrollmentSessions[0]
  const identity = state.data.patientIdentities.find((candidate) => candidate.id === session?.identityId)

  const cases: NavigatorEnrollmentGateCase[] = [
    {
      id: 'navigator_enrollment_is_synthetic_no_phi',
      ok: session !== undefined && session.synthetic && session.patientDataIncluded === false,
      detail:
        session === undefined
          ? 'missing session'
          : `synthetic=${session.synthetic};patientData=${session.patientDataIncluded}`,
    },
    {
      id: 'navigator_enrollment_links_proofed_in_person_identity',
      ok:
        session !== undefined &&
        identity !== undefined &&
        identity.patientId === session.patientId &&
        identity.proofingStatus === 'proofed_in_person',
      detail: identity === undefined ? 'missing identity' : `proofing=${identity.proofingStatus}`,
    },
    {
      id: 'navigator_enrollment_is_offline_capable',
      ok:
        session !== undefined &&
        session.offlineCapable &&
        session.steps.length >= 4 &&
        session.steps.every((step) => step.status === 'complete'),
      detail:
        session === undefined
          ? 'missing session'
          : `offline=${session.offlineCapable};steps=${session.steps.length}`,
    },
    {
      id: 'navigator_enrollment_trust_transfer_ready',
      ok:
        session !== undefined &&
        session.trustTransferStatus === 'ready_for_patient_login' &&
        session.patientLoginHandoff.trim().length > 0,
      detail: session === undefined ? 'missing session' : session.trustTransferStatus,
    },
    {
      id: 'real_identity_proofing_and_account_creation_stay_blocked',
      ok: session !== undefined && navigatorEnrollmentIsPrototypeSafe(session),
      detail: session === undefined ? 'missing session' : `blockers=${session.blockers.join(',')}`,
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
