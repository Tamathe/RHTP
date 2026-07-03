import type { ScreeningSite } from '../types'

export type MatchMode = 'best' | 'fastest' | 'closest'

const bestScore = (site: ScreeningSite): number => {
  let score = site.distanceMiles
  if (!site.rideSupport) score += 20
  if (!site.lowCost) score += 15
  return score
}

export const rankSites = (sites: ScreeningSite[], mode: MatchMode): ScreeningSite[] => {
  const copy = [...sites]
  if (mode === 'closest') return copy.sort((a, b) => a.distanceMiles - b.distanceMiles)
  if (mode === 'fastest') return copy.sort((a, b) => a.nextAvailableHours - b.nextAvailableHours)
  return copy.sort((a, b) => bestScore(a) - bestScore(b))
}

export const explainMatch = (site: ScreeningSite, mode: MatchMode): string => {
  const lead =
    mode === 'best' ? 'Best match' : mode === 'fastest' ? 'Fastest option' : 'Closest option'
  const parts = [`it is ${site.distanceMiles} miles away`, `open ${site.nextAvailable}`]
  if (site.rideSupport) parts.push('has ride support')
  if (site.lowCost) parts.push('is low-cost')
  return `${lead} because ${parts.join(', ')}.`
}
