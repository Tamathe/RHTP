import { describe, expect, it } from 'vitest'
import { runP3IngestionGate } from './p3-ingestion-gate'

describe('P3 ingestion gate', () => {
  it('proves the local P3 ingestion boundary across source registry, consent, E2, H2, and H3', () => {
    const report = runP3IngestionGate()

    expect(report.summary).toEqual({
      ok: true,
      passed: 6,
      total: 6,
    })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'p3_source_registry_present',
      'consent_required_for_patient_access_claims',
      'corroborated_claims_land_with_fhir_provenance',
      'wrong_patient_claims_held_for_identity_review',
      'async_access_gate_composed',
      'part2_gate_composed',
    ])
  })
})
