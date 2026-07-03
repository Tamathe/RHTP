import { describe, expect, it } from 'vitest'
import type { ScreeningSite } from '../types'
import { explainMatch, rankSites } from './site-matching'

const sites: ScreeningSite[] = [
  {
    id: 'mobile',
    name: 'Mobile Camera',
    type: 'mobile_clinic',
    distanceMiles: 8,
    nextAvailable: 'Saturday 9:00 AM',
    nextAvailableHours: 30,
    rideSupport: true,
    lowCost: true,
  },
  {
    id: 'eye',
    name: 'Eye Clinic',
    type: 'eye_clinic',
    distanceMiles: 34,
    nextAvailable: 'Tomorrow 2:00 PM',
    nextAvailableHours: 20,
    rideSupport: false,
    lowCost: false,
  },
  {
    id: 'fqhc',
    name: 'County FQHC',
    type: 'fqhc',
    distanceMiles: 15,
    nextAvailable: 'Monday 10:00 AM',
    nextAvailableHours: 60,
    rideSupport: false,
    lowCost: true,
  },
]

describe('rankSites', () => {
  it('closest ranks by distance ascending', () => {
    expect(rankSites(sites, 'closest').map((s) => s.id)).toEqual(['mobile', 'fqhc', 'eye'])
  })

  it('fastest ranks by soonest availability', () => {
    expect(rankSites(sites, 'fastest')[0].id).toBe('eye')
  })

  it('best favors the ride-supported, low-cost, nearby site', () => {
    expect(rankSites(sites, 'best')[0].id).toBe('mobile')
  })
})

describe('explainMatch', () => {
  it('explains a best match with distance and ride support', () => {
    const text = explainMatch(sites[0], 'best')
    expect(text).toContain('8 miles')
    expect(text).toContain('ride support')
  })
})
