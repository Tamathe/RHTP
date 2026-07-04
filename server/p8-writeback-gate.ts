import {
  approveClinicianWritebackDraft,
  createClinicianWritebackDraft,
  getClinicianSummarySurface,
  persistClinicianWritebackDraft,
  signClinicianWritebackDraft,
  summarizeExpansionCohorts,
} from './clinician-writeback'
import { createInitialBackendState } from './state'

export interface P8WritebackGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface P8WritebackGateReport {
  cases: P8WritebackGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

export function runP8WritebackGate(): P8WritebackGateReport {
  const initial = createInitialBackendState()
  const draft = createClinicianWritebackDraft(initial, {
    patientId: 'pat_ruthann',
    sourceSummaryId: 'summary_p8_safe',
    body: 'Program activity: eye-screening gap discussed, transportation barrier noted, and navigator follow-up requested.',
  })
  const approvalBeforeSignature = approveClinicianWritebackDraft(draft.state, {
    draftId: draft.ok ? draft.draft.id : '',
    clinicianId: 'clinician_lee',
  })
  const prohibited = createClinicianWritebackDraft(initial, {
    patientId: 'pat_ruthann',
    sourceSummaryId: 'summary_p8_unsafe',
    body: 'Patient likely has diabetes and should change medication dose today; urgent triage required.',
  })
  const signed = signClinicianWritebackDraft(draft.state, {
    draftId: draft.ok ? draft.draft.id : '',
    navigatorAttesterId: 'nav_dana',
  })
  const approved = approveClinicianWritebackDraft(signed.state, {
    draftId: signed.ok ? signed.draft.id : '',
    clinicianId: 'clinician_lee',
  })
  const persisted = persistClinicianWritebackDraft(approved.state, {
    draftId: approved.ok ? approved.draft.id : '',
    emrSystem: 'smart_sandbox',
  })
  const disabledSurface = getClinicianSummarySurface({ p8FlagEnabled: false, launchContext: 'emr' })
  const navigatorSurface = getClinicianSummarySurface({ p8FlagEnabled: true, launchContext: 'navigator_console' })
  const emrSurface = getClinicianSummarySurface({ p8FlagEnabled: true, launchContext: 'emr' })
  const expansion = summarizeExpansionCohorts(initial)
  const prohibitedAudit = prohibited.state.auditEvents.some(
    (event) => event.action === 'clinician_writeback_blocked' && event.outcome === 'blocked',
  )

  const cases: P8WritebackGateCase[] = [
    {
      id: 'p8_writeback_requires_navigator_signature',
      ok: !approvalBeforeSignature.ok && approvalBeforeSignature.reason === 'navigator_signature_required',
      detail: approvalBeforeSignature.ok ? 'unexpected approval' : approvalBeforeSignature.reason,
    },
    {
      id: 'p8_prohibited_content_blocked_and_audited',
      ok: !prohibited.ok && prohibited.reason === 'prohibited_content' && prohibitedAudit,
      detail: prohibited.ok ? 'unexpected draft' : `${prohibited.reason};audit=${prohibitedAudit}`,
    },
    {
      id: 'p8_signed_summary_can_be_approved_and_persisted',
      ok:
        signed.ok &&
        approved.ok &&
        persisted.ok &&
        persisted.draft.status === 'persisted' &&
        persisted.draft.fhirResourceType === 'DocumentReference' &&
        persisted.draft.provenance.attester === 'nav_dana',
      detail: persisted.ok ? persisted.draft.status : persisted.reason,
    },
    {
      id: 'p8_clinician_surface_emr_launch_only',
      ok:
        !disabledSurface.available &&
        disabledSurface.reason === 'p8_flag_disabled' &&
        !navigatorSurface.available &&
        navigatorSurface.reason === 'emr_launch_required' &&
        emrSurface.available,
      detail: `disabled=${disabledSurface.reason};navigator=${navigatorSurface.reason};emr=${emrSurface.reason}`,
    },
    {
      id: 'p8_expansion_summary_uses_synthetic_multi_county_cohort',
      ok: expansion.syntheticOnly && expansion.counties.length >= 6 && expansion.patientCount >= 13,
      detail: `patients=${expansion.patientCount};counties=${expansion.counties.join(',')}`,
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
