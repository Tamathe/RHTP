import { describe, expect, it } from 'vitest'
import { isAutonomousActionAllowed, screenPatientMessage } from './safety'

describe('screenPatientMessage', () => {
  it('detects sudden vision loss as a red flag', () => {
    const result = screenPatientMessage('I suddenly lost vision in my left eye')

    expect(result.category).toBe('red_flag')
    expect(result.queueReason).toBe('red_flag_symptom')
    expect(result.patientCopy).toMatch(/urgent/i)
  })

  it('detects flashes, floaters, and eye pain as red flags', () => {
    expect(screenPatientMessage('I see new flashes and floaters').category).toBe('red_flag')
    expect(screenPatientMessage('My eye pain is getting worse').category).toBe('red_flag')
  })

  it('routes diagnosis and medication questions to fallback', () => {
    expect(screenPatientMessage('Do I have diabetic retinopathy?').category).toBe('off_protocol')
    expect(screenPatientMessage('Should I change my insulin?').category).toBe('off_protocol')
  })

  it('keeps normal logistics questions autonomous', () => {
    const result = screenPatientMessage('Can you help me find a Saturday appointment?')

    expect(result.category).toBe('normal')
    expect(result.queueReason).toBeUndefined()
  })
})

describe('isAutonomousActionAllowed', () => {
  it('allows protocol actions Sandy is permitted to take', () => {
    expect(isAutonomousActionAllowed('answer_education')).toBe(true)
    expect(isAutonomousActionAllowed('collect_barrier')).toBe(true)
    expect(isAutonomousActionAllowed('match_site')).toBe(true)
    expect(isAutonomousActionAllowed('confirm_plan')).toBe(true)
  })

  it('blocks clinical judgment actions', () => {
    expect(isAutonomousActionAllowed('diagnose_symptom')).toBe(false)
    expect(isAutonomousActionAllowed('change_medication')).toBe(false)
    expect(isAutonomousActionAllowed('reassure_red_flag')).toBe(false)
  })
})
