import { describe, expect, it } from 'vitest'

import { HERO_ID, seed } from '../data/seed'
import {
  findNavigatorEnrollmentForPatient,
  navigatorEnrollmentIsPrototypeSafe,
  summarizeNavigatorEnrollment,
} from './navigator-enrollment'

describe('navigator enrollment helpers', () => {
  it('finds an in-person navigator-attested enrollment for the hero patient', () => {
    const enrollment = findNavigatorEnrollmentForPatient(seed.navigatorEnrollmentSessions, HERO_ID)

    expect(enrollment?.channel).toBe('in_person')
    expect(enrollment?.attestationLabel).toBe('Navigator-attested')
    expect(enrollment?.proofingStatus).toBe('proofed_in_person')
    expect(enrollment?.offlineCapable).toBe(true)
  })

  it('keeps navigator enrollment prototype safe', () => {
    const enrollment = seed.navigatorEnrollmentSessions[0]

    expect(navigatorEnrollmentIsPrototypeSafe(enrollment)).toBe(true)
    expect(summarizeNavigatorEnrollment(enrollment)).toEqual({
      completedStepCount: 4,
      offlineCapable: true,
      realAccountCreationBlocked: true,
      trustTransferReady: true,
    })
  })
})
