import type { CoverageNavigationOption } from '../types'

const REQUIRED_PROTOTYPE_BLOCKERS = [
  'prototype_no_real_coverage_adjudication',
  'prototype_no_ride_booking',
] as const

export interface CoverageNavigationSummary {
  optionCount: number
  rideReady: boolean
  navigatorConfirmationRequired: boolean
  blockedFromRealBooking: boolean
  prototypeSafeCount: number
}

export function coverageOptionIsPrototypeSafe(option: CoverageNavigationOption): boolean {
  return (
    option.synthetic &&
    option.requiresNavigatorConfirmation &&
    REQUIRED_PROTOTYPE_BLOCKERS.every((blocker) => option.blockers.includes(blocker))
  )
}

export function summarizeCoverageNavigation(
  options: CoverageNavigationOption[],
): CoverageNavigationSummary {
  return {
    optionCount: options.length,
    rideReady: options.some((option) => option.rideResourceId !== undefined),
    navigatorConfirmationRequired:
      options.length > 0 && options.every((option) => option.requiresNavigatorConfirmation),
    blockedFromRealBooking:
      options.length > 0 &&
      options.every((option) =>
        REQUIRED_PROTOTYPE_BLOCKERS.every((blocker) => option.blockers.includes(blocker)),
      ),
    prototypeSafeCount: options.filter(coverageOptionIsPrototypeSafe).length,
  }
}

export function bestCoverageOptionForSite(
  options: CoverageNavigationOption[],
  siteId: string,
): CoverageNavigationOption | undefined {
  return options
    .filter((option) => option.siteId === siteId)
    .slice()
    .sort((left, right) => {
      const rideScore = Number(right.rideResourceId !== undefined) - Number(left.rideResourceId !== undefined)
      if (rideScore !== 0) return rideScore

      return Number(left.requiresNavigatorConfirmation) - Number(right.requiresNavigatorConfirmation)
    })[0]
}
