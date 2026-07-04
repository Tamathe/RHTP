import { describe, expect, it } from 'vitest'
import { canAutonomouslyUseExternalRecord, corroborateIdentity } from './identity-corroboration'

describe('identity corroboration', () => {
  const candidate = {
    patientId: 'pat_ruthann',
    name: 'Ruth Ann Caldwell',
    dateOfBirth: '1974-03-14',
    strongIds: { payer_member_id: 'KY-MCO-123' },
  }

  it('downgrades a deterministic strong-ID-only hit to navigator identity review', () => {
    const result = corroborateIdentity(candidate, {
      externalSystem: 'kentucky_mco',
      externalRecordId: 'ext_wrong_patient',
      matchMethod: 'deterministic',
      matchConfidence: 1,
      strongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      name: 'Marla Baker',
      dateOfBirth: '1968-10-03',
      patientConfirmed: false,
    })

    expect(result.decision).toBe('navigator_review')
    expect(result.queueReason).toBe('identity_match_review')
    expect(result.matchQuality.matchedOn).toEqual(['payer_member_id'])
    expect(result.matchQuality.demographicCorroborated).toBe(false)
    expect(canAutonomouslyUseExternalRecord(result)).toBe(false)
  })

  it('auto-links corroborated deterministic matches but still blocks outreach before patient confirmation', () => {
    const result = corroborateIdentity(candidate, {
      externalSystem: 'kentucky_mco',
      externalRecordId: 'ext_ruth',
      matchMethod: 'deterministic',
      matchConfidence: 1,
      strongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      name: 'Ruth A. Caldwell',
      dateOfBirth: '1974-03-14',
      patientConfirmed: false,
    })

    expect(result.decision).toBe('auto_link')
    expect(result.matchQuality.matchedOn).toEqual(['payer_member_id', 'date_of_birth'])
    expect(canAutonomouslyUseExternalRecord(result)).toBe(false)
  })

  it('allows autonomous use only after the first patient confirmation', () => {
    const result = corroborateIdentity(candidate, {
      externalSystem: 'kentucky_mco',
      externalRecordId: 'ext_ruth_confirmed',
      matchMethod: 'deterministic',
      matchConfidence: 1,
      strongIdentifier: { kind: 'payer_member_id', value: 'KY-MCO-123' },
      name: 'Ruth Ann Caldwell',
      dateOfBirth: '1974-03-14',
      patientConfirmed: true,
    })

    expect(result.decision).toBe('auto_link')
    expect(result.patientConfirmed).toBe(true)
    expect(canAutonomouslyUseExternalRecord(result)).toBe(true)
  })

  it('routes probabilistic matches below the auto-link threshold to identity review', () => {
    const result = corroborateIdentity(candidate, {
      externalSystem: 'kentucky_mco',
      externalRecordId: 'ext_probable',
      matchMethod: 'probabilistic',
      matchConfidence: 0.88,
      name: 'Ruth Caldwell',
      dateOfBirth: '1974-03-14',
      patientConfirmed: false,
    })

    expect(result.decision).toBe('navigator_review')
    expect(result.queueReason).toBe('identity_match_review')
    expect(canAutonomouslyUseExternalRecord(result)).toBe(false)
  })
})
