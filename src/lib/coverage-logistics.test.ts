import { describe, expect, it } from 'vitest'

import { seed } from '../data/seed'
import {
  bestCoverageOptionForSite,
  coverageOptionIsPrototypeSafe,
  summarizeCoverageNavigation,
} from './coverage-logistics'

describe('coverage logistics helpers', () => {
  it('summarizes synthetic coverage and ride options without unlocking real booking', () => {
    const summary = summarizeCoverageNavigation(seed.coverageNavigationOptions)

    expect(summary.optionCount).toBeGreaterThanOrEqual(2)
    expect(summary.rideReady).toBe(true)
    expect(summary.navigatorConfirmationRequired).toBe(true)
    expect(summary.blockedFromRealBooking).toBe(true)
  })

  it('keeps every coverage option prototype safe', () => {
    expect(seed.coverageNavigationOptions.every(coverageOptionIsPrototypeSafe)).toBe(true)
  })

  it('selects the site-specific option with ride support first', () => {
    const option = bestCoverageOptionForSite(seed.coverageNavigationOptions, 'site_fqhc_mobile')

    expect(option?.payerLabel).toBe('Kentucky Medicaid MCO demo')
    expect(option?.rideResourceId).toBe('lklp_transportation_region_13')
    expect(option?.requiresNavigatorConfirmation).toBe(true)
  })
})
