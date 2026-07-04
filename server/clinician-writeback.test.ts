import { describe, expect, it } from 'vitest'

import {
  approveClinicianWritebackDraft,
  createClinicianWritebackDraft,
  getClinicianSummarySurface,
  persistClinicianWritebackDraft,
  signClinicianWritebackDraft,
  summarizeExpansionCohorts,
} from './clinician-writeback'
import { createInitialBackendState } from './state'

describe('clinician writeback boundary', () => {
  it('requires navigator signature before clinician approval or persistence', () => {
    const state = createInitialBackendState()
    const draftResult = createClinicianWritebackDraft(state, {
      patientId: 'pat_ruthann',
      sourceSummaryId: 'summary_ruth_1',
      body: 'Ruth Ann completed a program conversation and asked for help arranging follow-up transportation.',
    })

    expect(draftResult.ok).toBe(true)
    if (!draftResult.ok) throw new Error('draft should be created')
    expect(draftResult.draft.status).toBe('draft')

    const approvalBeforeSignature = approveClinicianWritebackDraft(draftResult.state, {
      draftId: draftResult.draft.id,
      clinicianId: 'clinician_lee',
    })
    const persistenceBeforeApproval = persistClinicianWritebackDraft(draftResult.state, {
      draftId: draftResult.draft.id,
      emrSystem: 'smart_sandbox',
    })

    expect(approvalBeforeSignature.ok).toBe(false)
    if (approvalBeforeSignature.ok) throw new Error('approval should require navigator signature')
    expect(approvalBeforeSignature.reason).toBe('navigator_signature_required')
    expect(persistenceBeforeApproval.ok).toBe(false)
    if (persistenceBeforeApproval.ok) throw new Error('persistence should require clinician approval')
    expect(persistenceBeforeApproval.reason).toBe('clinician_approval_required')
  })

  it('blocks diagnosis, dosing, and triage language before draft creation', () => {
    const state = createInitialBackendState()
    const result = createClinicianWritebackDraft(state, {
      patientId: 'pat_ruthann',
      sourceSummaryId: 'summary_ruth_unsafe',
      body: 'Patient likely has hypertension and should double metformin today; urgent triage required.',
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unsafe draft should be blocked')
    expect(result.reason).toBe('prohibited_content')
    expect(result.state.auditEvents).toEqual([
      expect.objectContaining({
        action: 'clinician_writeback_blocked',
        outcome: 'blocked',
        patientId: 'pat_ruthann',
      }),
    ])
  })

  it('signs, approves, and persists a navigator-attested DocumentReference draft', () => {
    const state = createInitialBackendState()
    const draftResult = createClinicianWritebackDraft(state, {
      patientId: 'pat_ruthann',
      sourceSummaryId: 'summary_ruth_safe',
      body: 'Program activity: eye-screening gap discussed, transportation barrier noted, and navigator follow-up requested.',
    })
    if (!draftResult.ok) throw new Error('draft should be created')
    const signed = signClinicianWritebackDraft(draftResult.state, {
      draftId: draftResult.draft.id,
      navigatorAttesterId: 'nav_dana',
    })
    if (!signed.ok) throw new Error('draft should be signed')
    const approved = approveClinicianWritebackDraft(signed.state, {
      draftId: signed.draft.id,
      clinicianId: 'clinician_lee',
    })
    if (!approved.ok) throw new Error('signed draft should be approved')
    const persisted = persistClinicianWritebackDraft(approved.state, {
      draftId: approved.draft.id,
      emrSystem: 'smart_sandbox',
    })
    if (!persisted.ok) throw new Error('approved draft should be persisted')

    expect(signed.draft.status).toBe('navigator_signed')
    expect(approved.draft.status).toBe('clinician_approved')
    expect(persisted.ok).toBe(true)
    expect(persisted.draft).toEqual(
      expect.objectContaining({
        status: 'persisted',
        fhirResourceType: 'DocumentReference',
        provenance: { author: 'rhtp_program', attester: 'nav_dana' },
        containsProhibited: false,
      }),
    )
  })

  it('gates the clinician summary surface to P8 EMR launch context only', () => {
    expect(getClinicianSummarySurface({ p8FlagEnabled: false, launchContext: 'emr' })).toEqual({
      available: false,
      reason: 'p8_flag_disabled',
    })
    expect(getClinicianSummarySurface({ p8FlagEnabled: true, launchContext: 'navigator_console' })).toEqual({
      available: false,
      reason: 'emr_launch_required',
    })
    expect(getClinicianSummarySurface({ p8FlagEnabled: true, launchContext: 'emr' })).toEqual({
      available: true,
      reason: 'ready',
    })
  })

  it('summarizes the synthetic multi-county cohort for expansion proof', () => {
    const state = createInitialBackendState()
    const summary = summarizeExpansionCohorts(state)

    expect(summary.syntheticOnly).toBe(true)
    expect(summary.counties.length).toBeGreaterThanOrEqual(6)
    expect(summary.patientCount).toBeGreaterThanOrEqual(13)
  })
})
