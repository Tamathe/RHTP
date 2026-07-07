import type { ScreeningSite, ScreeningVenueType } from '../types'

export interface GeoPoint {
  lat: number
  lng: number
}

// A small demo table of Kentucky ZIP centroids (approximate). This is a
// prototype fallback for a real geocoder, not survey-grade data. It lets
// "based on your ZIP code" become a real computation for the demo.
export const KY_ZIP_CENTROIDS: Record<string, GeoPoint> = {
  '41701': { lat: 37.2726, lng: -83.2137 }, // Hazard (Perry)
  '41858': { lat: 37.1187, lng: -82.8266 }, // Whitesburg (Letcher)
  '41501': { lat: 37.4757, lng: -82.5188 }, // Pikeville (Pike)
  '40741': { lat: 37.1015, lng: -84.0913 }, // London (Laurel)
  '40507': { lat: 38.0447, lng: -84.4977 }, // Lexington (Fayette)
  '40202': { lat: 38.2564, lng: -85.7519 }, // Louisville (Jefferson)
  '40601': { lat: 38.2045, lng: -84.8733 }, // Frankfort (Franklin)
  '40391': { lat: 37.9903, lng: -84.1791 }, // Winchester (Clark)
  '42101': { lat: 36.9911, lng: -86.4514 }, // Bowling Green (Warren)
  '42301': { lat: 37.7719, lng: -87.1111 }, // Owensboro (Daviess)
  '42003': { lat: 37.0684, lng: -88.6339 }, // Paducah (McCracken)
  '40403': { lat: 37.5709, lng: -84.2963 }, // Berea (Madison)
}

const DEFAULT_ZIP = '41701'

const normalizeZip = (zip: string): string => (zip ?? '').trim().slice(0, 5)

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

// Great-circle distance in miles between two points.
export const haversineMiles = (a: GeoPoint, b: GeoPoint): number => {
  const earthRadiusMiles = 3958.8
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * earthRadiusMiles * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Resolve a ZIP to a centroid: exact match, then longest shared prefix, then a
// sensible default so an unknown ZIP never breaks the demo.
export const centroidForZip = (zip: string): GeoPoint => {
  const clean = normalizeZip(zip)
  if (KY_ZIP_CENTROIDS[clean]) return KY_ZIP_CENTROIDS[clean]

  const known = Object.keys(KY_ZIP_CENTROIDS)
  for (const prefixLength of [4, 3, 2]) {
    if (clean.length < prefixLength) continue
    const match = known.find((candidate) => candidate.slice(0, prefixLength) === clean.slice(0, prefixLength))
    if (match) return KY_ZIP_CENTROIDS[match]
  }
  return KY_ZIP_CENTROIDS[DEFAULT_ZIP]
}

export const isKnownZip = (zip: string): boolean => Boolean(KY_ZIP_CENTROIDS[normalizeZip(zip)])

// Recompute each site's distanceMiles from an origin ZIP. Sites without
// coordinates keep their seeded distanceMiles (site-matching fixtures rely on this).
export const withDistances = (sites: ScreeningSite[], originZip: string): ScreeningSite[] => {
  const origin = centroidForZip(originZip)
  return sites.map((site) => {
    if (typeof site.lat !== 'number' || typeof site.lng !== 'number') return site
    const miles = haversineMiles(origin, { lat: site.lat, lng: site.lng })
    return { ...site, distanceMiles: Math.max(1, Math.round(miles)) }
  })
}

export const VENUE_LABEL: Record<ScreeningVenueType, string> = {
  fqhc: 'Community health center',
  mobile_clinic: 'Mobile camera',
  community_camera: 'Community camera',
  eye_clinic: 'Eye clinic',
  kroger: 'Kroger',
  pharmacy: 'Pharmacy',
  primary_care: 'Primary care office',
}
