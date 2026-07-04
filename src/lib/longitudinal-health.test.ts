import { describe, expect, it } from 'vitest'
import { getHealthCompanionSection, healthCompanionSections } from './longitudinal-health'

describe('healthCompanionSections', () => {
  it('defines the four chronic-care companion sections', () => {
    expect(healthCompanionSections.map((section) => section.id)).toEqual([
      'blood-pressure',
      'glucose',
      'medications',
      'ask-sandy',
    ])
  })

  it('teaches blood pressure with a simulated digital cuff connection', () => {
    const section = getHealthCompanionSection('blood-pressure')

    expect(section.title).toBe('Blood pressure')
    expect(section.device?.name).toBe('Digital blood pressure cuff')
    expect(section.lessons).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/pressure inside your arteries/i),
        expect.stringMatching(/lower salt/i),
      ]),
    )
  })

  it('shows CGM sync and nighttime hyperglycemia follow-up insight', () => {
    const section = getHealthCompanionSection('glucose')

    expect(section.device?.name).toBe('Continuous glucose monitor')
    expect(section.insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Nighttime hyperglycemia pattern',
          suggestedAction: expect.stringMatching(/primary care/i),
        }),
      ]),
    )
  })

  it('keeps medication support inside safety boundaries', () => {
    const section = getHealthCompanionSection('medications')

    expect(section.medications).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Metformin', schedule: 'Twice daily' })]),
    )
    expect(section.safety).toMatch(/does not change medication doses/i)
  })
})
