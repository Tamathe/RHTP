import type { ClinicianWritebackDraft } from '../src/types'
import { appendAuditEvent } from './audit'
import type { BackendState } from './types'

export type WritebackFailureReason =
  | 'patient_not_found'
  | 'draft_not_found'
  | 'prohibited_content'
  | 'navigator_signature_required'
  | 'clinician_approval_required'

export type WritebackResult =
  | {
      ok: true
      state: BackendState
      draft: ClinicianWritebackDraft
    }
  | {
      ok: false
      state: BackendState
      reason: WritebackFailureReason
    }

export interface CreateWritebackDraftInput {
  patientId: string
  sourceSummaryId: string
  body: string
}

export interface SignWritebackDraftInput {
  draftId: string
  navigatorAttesterId: string
}

export interface ApproveWritebackDraftInput {
  draftId: string
  clinicianId: string
}

export interface PersistWritebackDraftInput {
  draftId: string
  emrSystem: string
}

export type ClinicianSurfaceLaunchContext = 'emr' | 'navigator_console'

export type ClinicianSurfaceStatus =
  | {
      available: true
      reason: 'ready'
    }
  | {
      available: false
      reason: 'p8_flag_disabled' | 'emr_launch_required'
    }

export interface ExpansionCohortSummary {
  syntheticOnly: boolean
  patientCount: number
  counties: string[]
}

let writebackCounter = 0
const now = (): string => '2026-07-04T09:00:00'

const prohibitedPatterns = [
  /\b(likely|probably)?\s*(has|have|diagnosed with)\s+(hypertension|diabetes|depression|retinopathy)\b/i,
  /\b(double|increase|change|adjust)\s+(the\s+)?(dose|insulin|metformin|medication)\b/i,
  /\b(dose|dosing|units of insulin)\b/i,
  /\btriage\b/i,
  /\bgo to (the )?(er|emergency room)\b/i,
]

function containsProhibitedContent(body: string): boolean {
  return prohibitedPatterns.some((pattern) => pattern.test(body))
}

function patientExists(state: BackendState, patientId: string): boolean {
  return state.data.patients.some((patient) => patient.id === patientId)
}

function findDraft(state: BackendState, draftId: string): ClinicianWritebackDraft | undefined {
  return state.data.clinicianWritebackDrafts.find((draft) => draft.id === draftId)
}

function replaceDraft(state: BackendState, draft: ClinicianWritebackDraft): BackendState {
  return {
    ...state,
    data: {
      ...state.data,
      clinicianWritebackDrafts: state.data.clinicianWritebackDrafts.map((candidate) =>
        candidate.id === draft.id ? draft : candidate,
      ),
    },
  }
}

function fail(
  state: BackendState,
  reason: WritebackFailureReason,
  detail: string,
  patientId?: string,
): WritebackResult {
  return {
    ok: false,
    reason,
    state: appendAuditEvent(state, {
      actor: 'system',
      action: 'clinician_writeback_blocked',
      outcome: 'blocked',
      patientId,
      detail,
    }),
  }
}

export function createClinicianWritebackDraft(
  state: BackendState,
  input: CreateWritebackDraftInput,
): WritebackResult {
  if (!patientExists(state, input.patientId)) {
    return fail(state, 'patient_not_found', 'Clinician writeback draft blocked because patient is missing.', input.patientId)
  }

  if (containsProhibitedContent(input.body)) {
    return fail(
      state,
      'prohibited_content',
      'Clinician writeback draft blocked because it contained diagnosis, dosing, or triage language.',
      input.patientId,
    )
  }

  writebackCounter += 1
  const draft: ClinicianWritebackDraft = {
    id: `doc_writeback_${writebackCounter}`,
    patientId: input.patientId,
    sourceSummaryId: input.sourceSummaryId,
    status: 'draft',
    fhirResourceType: 'DocumentReference',
    provenance: {
      author: 'rhtp_program',
      attester: '',
    },
    containsProhibited: false,
    body: input.body,
    createdAt: now(),
  }
  const nextState: BackendState = {
    ...state,
    data: {
      ...state.data,
      clinicianWritebackDrafts: [...state.data.clinicianWritebackDrafts, draft],
    },
  }

  return {
    ok: true,
    draft,
    state: appendAuditEvent(nextState, {
      actor: 'navigator',
      action: 'clinician_writeback_draft_created',
      outcome: 'allowed',
      patientId: input.patientId,
      sourceIds: [draft.id],
      detail: 'Navigator summary draft created as a local DocumentReference.',
    }),
  }
}

export function signClinicianWritebackDraft(
  state: BackendState,
  input: SignWritebackDraftInput,
): WritebackResult {
  const draft = findDraft(state, input.draftId)
  if (!draft) {
    return fail(state, 'draft_not_found', 'Clinician writeback signature blocked because draft is missing.')
  }

  const signed: ClinicianWritebackDraft = {
    ...draft,
    status: 'navigator_signed',
    navigatorAttesterId: input.navigatorAttesterId,
    provenance: {
      author: 'rhtp_program',
      attester: input.navigatorAttesterId,
    },
  }
  const nextState = replaceDraft(state, signed)

  return {
    ok: true,
    draft: signed,
    state: appendAuditEvent(nextState, {
      actor: 'navigator',
      action: 'clinician_writeback_navigator_signed',
      outcome: 'allowed',
      patientId: signed.patientId,
      sourceIds: [signed.id],
      detail: 'Navigator attested the clinician summary draft.',
    }),
  }
}

export function approveClinicianWritebackDraft(
  state: BackendState,
  input: ApproveWritebackDraftInput,
): WritebackResult {
  const draft = findDraft(state, input.draftId)
  if (!draft) {
    return fail(state, 'draft_not_found', 'Clinician writeback approval blocked because draft is missing.')
  }

  if (draft.status !== 'navigator_signed') {
    return fail(
      state,
      'navigator_signature_required',
      'Clinician writeback approval blocked because navigator signature is missing.',
      draft.patientId,
    )
  }

  const approved: ClinicianWritebackDraft = {
    ...draft,
    status: 'clinician_approved',
    clinicianApproverId: input.clinicianId,
  }
  const nextState = replaceDraft(state, approved)

  return {
    ok: true,
    draft: approved,
    state: appendAuditEvent(nextState, {
      actor: 'system',
      action: 'clinician_writeback_approved',
      outcome: 'allowed',
      patientId: approved.patientId,
      sourceIds: [approved.id],
      detail: 'Clinician approved a navigator-attested writeback draft.',
    }),
  }
}

export function persistClinicianWritebackDraft(
  state: BackendState,
  input: PersistWritebackDraftInput,
): WritebackResult {
  const draft = findDraft(state, input.draftId)
  if (!draft) {
    return fail(state, 'draft_not_found', 'Clinician writeback persistence blocked because draft is missing.')
  }

  if (draft.status !== 'clinician_approved') {
    return fail(
      state,
      'clinician_approval_required',
      'Clinician writeback persistence blocked because clinician approval is missing.',
      draft.patientId,
    )
  }

  const persisted: ClinicianWritebackDraft = {
    ...draft,
    status: 'persisted',
    emrSystem: input.emrSystem,
    persistedAt: now(),
  }
  const nextState = replaceDraft(state, persisted)

  return {
    ok: true,
    draft: persisted,
    state: appendAuditEvent(nextState, {
      actor: 'system',
      action: 'clinician_writeback_persisted',
      outcome: 'allowed',
      patientId: persisted.patientId,
      sourceIds: [persisted.id],
      detail: `Clinician writeback persisted to ${input.emrSystem} in the local P8 gate.`,
    }),
  }
}

export function getClinicianSummarySurface(input: {
  p8FlagEnabled: boolean
  launchContext: ClinicianSurfaceLaunchContext
}): ClinicianSurfaceStatus {
  if (!input.p8FlagEnabled) {
    return { available: false, reason: 'p8_flag_disabled' }
  }

  if (input.launchContext !== 'emr') {
    return { available: false, reason: 'emr_launch_required' }
  }

  return { available: true, reason: 'ready' }
}

export function summarizeExpansionCohorts(state: BackendState): ExpansionCohortSummary {
  return {
    syntheticOnly: true,
    patientCount: state.data.patients.length,
    counties: [...new Set(state.data.patients.map((patient) => patient.county))].sort(),
  }
}
