import { HERO_ID } from '../src/data/seed'
import {
  getDeviceConnectAvailability,
  ingestDeviceReading,
  p5DeviceSourceIds,
} from './p5-device-rail'
import { createInitialBackendState } from './state'

export interface P5DeviceGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface P5DeviceGateReport {
  cases: P5DeviceGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

const READING = {
  sourceId: 'dexcom_api',
  patientId: HERO_ID,
  observationType: 'glucose_cgm' as const,
  value: 252,
  unit: 'mg/dL',
  observedAt: '2026-07-04T02:15:00',
  fhirRef: 'Observation/ext_ruth_cgm_overnight_1',
  requestedAction: 'summarize_pattern' as const,
}

export function runP5DeviceGate(): P5DeviceGateReport {
  const state = createInitialBackendState()
  const accepted = ingestDeviceReading(state, READING)
  const unitBlocked = ingestDeviceReading(state, {
    ...READING,
    unit: 'mmol/L',
    fhirRef: 'Observation/ext_ruth_cgm_wrong_unit',
  })
  const unsafeBlocked = ingestDeviceReading(state, {
    ...READING,
    requestedAction: 'dose_insulin',
    fhirRef: 'Observation/ext_ruth_cgm_unsafe_action',
  })
  const webHealthkit = getDeviceConnectAvailability('web', 'healthkit_health_connect')
  const webDexcom = getDeviceConnectAvailability('web', 'dexcom_api')
  const insightText = accepted.insights.map((insight) => insight.suggestedAction).join(' ')
  const cases: P5DeviceGateCase[] = [
    {
      id: 'p5_device_source_registry_present',
      ok: p5DeviceSourceIds().join(',') === 'healthkit_health_connect,dexcom_api',
      detail: `deviceSources=${p5DeviceSourceIds().join(',')}`,
    },
    {
      id: 'canonical_units_required',
      ok: unitBlocked.status === 'unit_blocked' && unitBlocked.acceptedSourceFacts.length === 0,
      detail: unitBlocked.status,
    },
    {
      id: 'fhir_device_provenance_lands',
      ok:
        accepted.status === 'accepted' &&
        accepted.acceptedSourceFacts.length === 1 &&
        accepted.acceptedSourceFacts.every((fact) => fact.sourceKind === 'device' && !!fact.fhirRef),
      detail: accepted.status,
    },
    {
      id: 'non_diagnostic_insight_only',
      ok:
        accepted.insights.some((insight) => insight.clinicalAction === 'discuss_with_clinician') &&
        !/dose|diagnos|insulin/i.test(insightText),
      detail: accepted.insights.map((insight) => insight.ruleId).join(','),
    },
    {
      id: 'unsafe_device_action_blocked',
      ok: unsafeBlocked.status === 'action_blocked' && unsafeBlocked.acceptedSourceFacts.length === 0,
      detail: unsafeBlocked.status,
    },
    {
      id: 'web_runtime_native_sync_disabled',
      ok:
        !webHealthkit.canConnect &&
        webHealthkit.reason === 'native_shell_required' &&
        webDexcom.canConnect,
      detail: `healthkit=${webHealthkit.reason};dexcom=${webDexcom.reason}`,
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
