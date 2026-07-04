import { describe, expect, it } from 'vitest'
import { runP5DeviceGate } from './p5-device-gate'

describe('runP5DeviceGate', () => {
  it('passes the local P5 device rail boundary cases', () => {
    const report = runP5DeviceGate()

    expect(report.summary).toEqual({ ok: true, passed: 6, total: 6 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'p5_device_source_registry_present',
      'canonical_units_required',
      'fhir_device_provenance_lands',
      'non_diagnostic_insight_only',
      'unsafe_device_action_blocked',
      'web_runtime_native_sync_disabled',
    ])
  })
})
