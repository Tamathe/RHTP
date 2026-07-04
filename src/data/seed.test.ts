import { describe, expect, it } from 'vitest'
import { HERO_ID, seed } from './seed'

describe('seed integrity', () => {
  it('has exactly 13 patients including the hero', () => {
    expect(seed.patients).toHaveLength(13)
    expect(seed.patients.some((patient) => patient.id === HERO_ID)).toBe(true)
  })

  it('starts the hero gap as overdue', () => {
    const heroGap = seed.gaps.find((gap) => gap.patientId === HERO_ID)!
    expect(heroGap.status).toBe('overdue')
  })

  it('gives every patient exactly one gap with a valid status', () => {
    const valid = ['overdue', 'engaged', 'scheduled', 'completed', 'closed', 'referral', 'repeat']
    expect(seed.gaps).toHaveLength(13)
    for (const gap of seed.gaps) expect(valid).toContain(gap.status)
  })

  it('matches the documented counter baselines', () => {
    const val = (id: string) => seed.metrics.find((metric) => metric.id === id)!.value
    expect(val('contacted')).toBe(9)
    expect(val('scheduled')).toBe(5)
    expect(val('completed')).toBe(6)
    expect(val('gaps_closed')).toBe(4)
    expect(val('referrals')).toBe(1)
    seed.metrics
      .filter((metric) => metric.denominator !== null)
      .forEach((metric) => expect(metric.denominator).toBe(13))
  })

  it('keeps distance only on sites, never on patients', () => {
    for (const patient of seed.patients) expect(patient).not.toHaveProperty('distanceMiles')
    for (const site of seed.sites) expect(typeof site.distanceMiles).toBe('number')
  })
})

describe('production-shaped seed rails', () => {
  it('gives the hero patient consent and trusted source facts', () => {
    expect(seed.consents.find((consent) => consent.patientId === HERO_ID)?.status).toBe('active')
    expect(seed.patientIdentities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          patientId: HERO_ID,
          externalSystem: 'kentucky_mco',
          proofingStatus: 'proofed_delegated',
        }),
      ]),
    )
    expect(seed.sourceFacts.filter((fact) => fact.patientId === HERO_ID)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceKind: 'hie', label: 'Diabetes diagnosis' }),
        expect.objectContaining({ sourceKind: 'claims', label: 'Retinal screening gap' }),
        expect.objectContaining({ sourceKind: 'site_feed', label: 'Screening site availability' }),
      ]),
    )
    for (const fact of seed.sourceFacts) {
      expect(typeof fact.patientConfirmed).toBe('boolean')
      expect(typeof fact.navigatorOverridden).toBe('boolean')
    }
  })

  it('starts the hero protocol with imported gap and consent events', () => {
    expect(seed.protocolEvents.filter((event) => event.patientId === HERO_ID)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'care_gap_imported', status: 'identified' }),
        expect.objectContaining({ type: 'patient_consented', status: 'patient_contactable' }),
      ]),
    )
  })

  it('starts without navigator queue noise for the hero patient', () => {
    expect(seed.navigatorQueue.filter((item) => item.patientId === HERO_ID)).toHaveLength(0)
    expect(seed.redFlagEvents).toHaveLength(0)
    expect(seed.asyncAccessTokens).toHaveLength(0)
  })
})
