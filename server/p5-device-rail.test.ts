import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import {
  getDeviceConnectAvailability,
  ingestDeviceReading,
  p5DeviceSourceIds,
} from './p5-device-rail'
import { createInitialBackendState } from './state'

const CGM_READING = {
  sourceId: 'dexcom_api',
  patientId: HERO_ID,
  observationType: 'glucose_cgm' as const,
  value: 252,
  unit: 'mg/dL',
  observedAt: '2026-07-04T02:15:00',
  fhirRef: 'Observation/ext_ruth_cgm_overnight_1',
  requestedAction: 'summarize_pattern' as const,
}

describe('P5 local device rail boundary', () => {
  it('registers the first direct device sources separately from the claims PDC floor', () => {
    expect(p5DeviceSourceIds()).toEqual(['healthkit_health_connect', 'dexcom_api'])
  })

  it('lands a CGM reading as FHIR-backed device provenance with a non-diagnostic insight', () => {
    const result = ingestDeviceReading(createInitialBackendState(), CGM_READING)

    expect(result.status).toBe('accepted')
    expect(result.acceptedSourceFacts).toEqual([
      expect.objectContaining({
        sourceKind: 'device',
        sourceName: 'Dexcom API',
        label: 'CGM glucose',
        value: '252 mg/dL',
        fhirRef: 'Observation/ext_ruth_cgm_overnight_1',
        patientConfirmed: false,
      }),
    ])
    expect(result.insights).toEqual([
      expect.objectContaining({
        ruleId: 'insight.glucose.cgm_high_review',
        clinicalAction: 'discuss_with_clinician',
      }),
    ])
    expect(result.insights[0]?.suggestedAction).toMatch(/discuss/i)
    expect(result.insights[0]?.suggestedAction).not.toMatch(/dose|diagnos|insulin/i)
  })

  it('blocks device readings with non-canonical units before adding source facts', () => {
    const state = createInitialBackendState()
    const result = ingestDeviceReading(state, {
      ...CGM_READING,
      unit: 'mmol/L',
      fhirRef: 'Observation/ext_ruth_cgm_wrong_unit',
    })

    expect(result.status).toBe('unit_blocked')
    expect(result.acceptedSourceFacts).toHaveLength(0)
    expect(result.state.data.sourceFacts).toHaveLength(state.data.sourceFacts.length)
  })

  it('blocks unsafe device actions such as insulin dosing before adding source facts', () => {
    const state = createInitialBackendState()
    const result = ingestDeviceReading(state, {
      ...CGM_READING,
      requestedAction: 'dose_insulin',
      fhirRef: 'Observation/ext_ruth_cgm_dosing_request',
    })

    expect(result.status).toBe('action_blocked')
    expect(result.acceptedSourceFacts).toHaveLength(0)
    expect(result.insights).toHaveLength(0)
    expect(result.state.data.sourceFacts).toHaveLength(state.data.sourceFacts.length)
  })

  it('keeps native HealthKit and Health Connect sync disabled on web while allowing Dexcom OAuth', () => {
    expect(getDeviceConnectAvailability('web', 'healthkit_health_connect')).toEqual({
      sourceId: 'healthkit_health_connect',
      canConnect: false,
      reason: 'native_shell_required',
    })
    expect(getDeviceConnectAvailability('web', 'dexcom_api')).toEqual({
      sourceId: 'dexcom_api',
      canConnect: true,
      reason: 'patient_oauth_supported',
    })
  })
})
