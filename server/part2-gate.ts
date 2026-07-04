import { HERO_ID } from '../src/data/seed'
import { createInitialBackendState } from './state'
import { ingestHieDischargeEvent, type IngestHieDischargeEventInput } from './part2-suppression'

export interface H3Part2GateCase {
  id: string
  ok: boolean
  decision: 'accepted' | 'navigator_review'
  sensitiveTextSuppressed: boolean
  auditRecorded: boolean
}

export interface H3Part2GateReport {
  cases: H3Part2GateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
    sensitiveTextSuppressed: boolean
  }
}

const SENSITIVE_TEXT = /appalachian recovery|recovery center|substance|sud|opioid|methadone|detox/i

function baseInput(overrides: Partial<IngestHieDischargeEventInput>): IngestHieDischargeEventInput {
  return {
    patientId: HERO_ID,
    sourceName: 'KHIE ADT feed',
    facilityName: 'Hazard Regional Hospital',
    dischargeDisposition: 'home',
    effectiveDate: '2026-07-03',
    retrievedAt: '2026-07-04',
    fhirRef: 'Encounter/hie-discharge',
    ...overrides,
  }
}

function exposedText(result: ReturnType<typeof ingestHieDischargeEvent>): string {
  return JSON.stringify({
    sourceFacts: result.state.data.sourceFacts,
    navigatorQueue: result.state.data.navigatorQueue,
    auditEvents: result.state.auditEvents,
  })
}

export function runH3Part2Gate(): H3Part2GateReport {
  const sensitive = ingestHieDischargeEvent(
    createInitialBackendState(),
    baseInput({
      facilityName: 'Appalachian Recovery Center',
      dischargeDisposition: 'substance_use_treatment_discharge',
      fhirRef: 'Encounter/part2-sensitive',
    }),
  )
  const unknown = ingestHieDischargeEvent(
    createInitialBackendState(),
    baseInput({
      facilityName: 'Unknown Regional Clinic',
      dischargeDisposition: 'left through side entrance',
      fhirRef: 'Encounter/unknown-disposition',
    }),
  )
  const safe = ingestHieDischargeEvent(createInitialBackendState(), baseInput({}))

  const sensitiveSuppressed = !SENSITIVE_TEXT.test(exposedText(sensitive))
  const unknownSuppressed = !SENSITIVE_TEXT.test(exposedText(unknown))
  const safeNoSensitiveText = !SENSITIVE_TEXT.test(exposedText(safe))
  const cases: H3Part2GateCase[] = [
    {
      id: 'sensitive_facility_identity_suppressed',
      ok:
        sensitive.decision === 'navigator_review' &&
        sensitive.acceptedSourceFact?.label === 'Restricted discharge event' &&
        sensitive.state.data.navigatorQueue.at(-1)?.reason === 'segmented_data_review' &&
        sensitiveSuppressed,
      decision: sensitive.decision,
      sensitiveTextSuppressed: sensitiveSuppressed,
      auditRecorded: sensitive.state.auditEvents.some((event) => event.action === 'part2_discharge_suppressed'),
    },
    {
      id: 'unrecognized_disposition_failed_closed',
      ok:
        unknown.decision === 'navigator_review' &&
        unknown.acceptedSourceFact === undefined &&
        unknown.state.data.navigatorQueue.at(-1)?.reason === 'segmented_data_review' &&
        unknownSuppressed,
      decision: unknown.decision,
      sensitiveTextSuppressed: unknownSuppressed,
      auditRecorded: unknown.state.auditEvents.some((event) => event.action === 'part2_discharge_failed_closed'),
    },
    {
      id: 'recognized_non_sensitive_discharge_allowed',
      ok:
        safe.decision === 'accepted' &&
        safe.acceptedSourceFact?.label === 'Hospital discharge' &&
        safe.state.data.navigatorQueue.length === 0 &&
        safeNoSensitiveText,
      decision: safe.decision,
      sensitiveTextSuppressed: safeNoSensitiveText,
      auditRecorded: safe.state.auditEvents.some((event) => event.action === 'hie_discharge_ingested'),
    },
  ]
  const passed = cases.filter((testCase) => testCase.ok && testCase.auditRecorded).length
  const sensitiveTextSuppressed = cases.every((testCase) => testCase.sensitiveTextSuppressed)

  return {
    cases,
    summary: {
      ok: passed === cases.length && sensitiveTextSuppressed,
      passed,
      total: cases.length,
      sensitiveTextSuppressed,
    },
  }
}
