import { coverageOptionIsPrototypeSafe } from '../src/lib/coverage-logistics'
import { getKentuckyResourceById } from '../src/lib/kentucky-sdoh-resources'
import { createInitialBackendState } from './state'

export interface CoverageLogisticsGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface CoverageLogisticsGateReport {
  cases: CoverageLogisticsGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

export function runCoverageLogisticsGate(): CoverageLogisticsGateReport {
  const state = createInitialBackendState()
  const options = state.data.coverageNavigationOptions
  const siteIds = new Set(state.data.sites.map((site) => site.id))
  const missingSiteIds = options.filter((option) => !siteIds.has(option.siteId)).map((option) => option.siteId)
  const rideResourceIds = options
    .map((option) => option.rideResourceId)
    .filter((resourceId): resourceId is string => resourceId !== undefined)
  const missingRideResourceIds = rideResourceIds.filter((resourceId) => getKentuckyResourceById(resourceId) === undefined)
  const unsafeIds = options.filter((option) => !coverageOptionIsPrototypeSafe(option)).map((option) => option.id)

  const cases: CoverageLogisticsGateCase[] = [
    {
      id: 'coverage_options_are_synthetic_no_phi',
      ok: options.length > 0 && options.every((option) => option.synthetic),
      detail: `options=${options.length};synthetic=${options.filter((option) => option.synthetic).length}`,
    },
    {
      id: 'coverage_options_link_to_sites',
      ok: options.length > 0 && missingSiteIds.length === 0,
      detail: missingSiteIds.length === 0 ? `linked=${options.length}` : `missing=${missingSiteIds.join(',')}`,
    },
    {
      id: 'ride_resources_resolve_to_kentucky_directory',
      ok: rideResourceIds.length > 0 && missingRideResourceIds.length === 0,
      detail:
        missingRideResourceIds.length === 0
          ? `rideResources=${rideResourceIds.length}`
          : `missing=${missingRideResourceIds.join(',')}`,
    },
    {
      id: 'coverage_requires_navigator_confirmation',
      ok: options.length > 0 && options.every((option) => option.requiresNavigatorConfirmation),
      detail: `navigatorRequired=${options.filter((option) => option.requiresNavigatorConfirmation).length}`,
    },
    {
      id: 'real_adjudication_and_booking_stay_blocked',
      ok: options.length > 0 && unsafeIds.length === 0,
      detail: unsafeIds.length === 0 ? 'real adjudication and ride booking blocked' : `unsafe=${unsafeIds.join(',')}`,
    },
  ]
  const passed = cases.filter((testCase) => testCase.ok).length

  return {
    cases,
    summary: {
      ok: passed === cases.length,
      passed,
      total: cases.length,
    },
  }
}
