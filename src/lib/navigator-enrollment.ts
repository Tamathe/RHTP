import type { NavigatorEnrollmentSession } from '../types'

const REQUIRED_BLOCKERS = ['prototype_no_real_identity_proofing', 'prototype_no_account_creation'] as const

export interface NavigatorEnrollmentSummary {
  completedStepCount: number
  offlineCapable: boolean
  realAccountCreationBlocked: boolean
  trustTransferReady: boolean
}

export function navigatorEnrollmentIsPrototypeSafe(session: NavigatorEnrollmentSession): boolean {
  return (
    session.synthetic &&
    session.patientDataIncluded === false &&
    session.channel === 'in_person' &&
    session.offlineCapable &&
    session.proofingStatus === 'proofed_in_person' &&
    session.trustTransferStatus === 'ready_for_patient_login' &&
    session.steps.length > 0 &&
    session.steps.every((step) => step.status === 'complete') &&
    REQUIRED_BLOCKERS.every((blocker) => session.blockers.includes(blocker))
  )
}

export function findNavigatorEnrollmentForPatient(
  sessions: NavigatorEnrollmentSession[],
  patientId: string,
): NavigatorEnrollmentSession | undefined {
  return sessions.find((session) => session.patientId === patientId)
}

export function summarizeNavigatorEnrollment(
  session: NavigatorEnrollmentSession,
): NavigatorEnrollmentSummary {
  return {
    completedStepCount: session.steps.filter((step) => step.status === 'complete').length,
    offlineCapable: session.offlineCapable,
    realAccountCreationBlocked: REQUIRED_BLOCKERS.every((blocker) => session.blockers.includes(blocker)),
    trustTransferReady: session.trustTransferStatus === 'ready_for_patient_login',
  }
}
