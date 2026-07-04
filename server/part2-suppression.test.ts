import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import { ingestHieDischargeEvent } from './part2-suppression'
import { createInitialBackendState } from './state'

const SENSITIVE_TEXT = /appalachian recovery|recovery center|substance|sud|opioid|methadone|detox/i

describe('Part 2 facility-identity suppression', () => {
  it('suppresses sensitive facility identity before source facts, navigator work, and audit text', () => {
    const state = createInitialBackendState()
    const result = ingestHieDischargeEvent(state, {
      patientId: HERO_ID,
      sourceName: 'KHIE ADT feed',
      facilityName: 'Appalachian Recovery Center',
      dischargeDisposition: 'substance_use_treatment_discharge',
      effectiveDate: '2026-07-03',
      retrievedAt: '2026-07-04',
      fhirRef: 'Encounter/part2-sensitive',
    })
    const exposed = JSON.stringify({
      sourceFacts: result.state.data.sourceFacts.slice(state.data.sourceFacts.length),
      navigatorQueue: result.state.data.navigatorQueue.slice(state.data.navigatorQueue.length),
      auditEvents: result.state.auditEvents,
    })

    expect(result.decision).toBe('navigator_review')
    expect(result.acceptedSourceFact).toEqual(
      expect.objectContaining({
        patientId: HERO_ID,
        label: 'Restricted discharge event',
        value: 'A restricted facility encounter requires navigator review before protocol use.',
        sourceKind: 'hie',
        confidence: 'needs_review',
      }),
    )
    expect(result.state.data.navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({
        reason: 'segmented_data_review',
        priority: 'soon',
        summary: 'Restricted HIE discharge evidence requires privacy review before protocol use.',
        suggestedAction: 'Confirm consent and segmentation rules before exposing this encounter anywhere else.',
      }),
    )
    expect(exposed).not.toMatch(SENSITIVE_TEXT)
  })

  it('fails closed for unrecognized discharge dispositions', () => {
    const state = createInitialBackendState()
    const result = ingestHieDischargeEvent(state, {
      patientId: HERO_ID,
      sourceName: 'KHIE ADT feed',
      facilityName: 'Unknown Regional Clinic',
      dischargeDisposition: 'left through side entrance',
      effectiveDate: '2026-07-03',
      retrievedAt: '2026-07-04',
      fhirRef: 'Encounter/unknown-disposition',
    })

    expect(result.decision).toBe('navigator_review')
    expect(result.acceptedSourceFact).toBeUndefined()
    expect(result.state.data.sourceFacts).toHaveLength(state.data.sourceFacts.length)
    expect(result.state.data.navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({
        reason: 'segmented_data_review',
        summary: 'Unrecognized HIE discharge disposition requires privacy review before protocol use.',
      }),
    )
  })

  it('accepts recognized non-sensitive discharge facts without creating segmented review work', () => {
    const state = createInitialBackendState()
    const result = ingestHieDischargeEvent(state, {
      patientId: HERO_ID,
      sourceName: 'KHIE ADT feed',
      facilityName: 'Hazard Regional Hospital',
      dischargeDisposition: 'home',
      effectiveDate: '2026-07-03',
      retrievedAt: '2026-07-04',
      fhirRef: 'Encounter/general-discharge',
    })

    expect(result.decision).toBe('accepted')
    expect(result.acceptedSourceFact).toEqual(
      expect.objectContaining({
        label: 'Hospital discharge',
        value: 'Discharged from Hazard Regional Hospital to home',
        confidence: 'confirmed',
      }),
    )
    expect(result.state.data.navigatorQueue).toHaveLength(state.data.navigatorQueue.length)
  })
})
