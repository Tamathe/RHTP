import { useState } from 'react'
import {
  Building2,
  Camera,
  Car,
  Clock,
  DollarSign,
  Eye,
  MapPin,
  Pill,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  Truck,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { bestCoverageOptionForSite } from '../../lib/coverage-logistics'
import { VENUE_LABEL, isKnownZip, withDistances } from '../../lib/ky-geo'
import { explainMatch, rankSites, type MatchMode } from '../../lib/site-matching'
import type { ScreeningVenueType } from '../../types'
import { useStore } from '../../store/useStore'
import { SmartCard } from './SmartCard'

const MODES: MatchMode[] = ['best', 'fastest', 'closest']
const MODE_LABEL: Record<MatchMode, string> = {
  best: 'Best match',
  fastest: 'Fastest',
  closest: 'Closest',
}

const VENUE_ICON: Record<ScreeningVenueType, ComponentType<{ className?: string }>> = {
  fqhc: Building2,
  mobile_clinic: Truck,
  community_camera: Camera,
  eye_clinic: Eye,
  kroger: ShoppingCart,
  pharmacy: Pill,
  primary_care: Stethoscope,
}

export function FindScreeningScreen({ onSelect }: { onSelect: (siteId: string) => void }) {
  const sites = useStore((state) => state.sites)
  const coverageNavigationOptions = useStore((state) => state.coverageNavigationOptions)
  const originZip = useStore((state) => state.originZip)
  const setOriginZip = useStore((state) => state.setOriginZip)
  const [mode, setMode] = useState<MatchMode>('best')

  const sitesWithDistance = withDistances(sites, originZip)
  const ranked = rankSites(sitesWithDistance, mode)
  const top = ranked[0]

  const byDistance = [...sitesWithDistance].sort((a, b) => a.distanceMiles - b.distanceMiles)
  const nearestEye = byDistance.find((site) => site.type === 'eye_clinic')
  const nearestCamera = byDistance.find((site) => site.type !== 'eye_clinic')
  const showEquity =
    nearestEye && nearestCamera && nearestEye.distanceMiles > nearestCamera.distanceMiles + 3

  const zipKnown = isKnownZip(originZip)

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-extrabold text-slate-900">Find screening</h1>

      <div className="rounded-lg border border-stone-200 p-3">
        <label htmlFor="zip" className="text-sm font-bold text-slate-700">
          Your ZIP code
        </label>
        <input
          id="zip"
          inputMode="numeric"
          value={originZip}
          onChange={(event) => setOriginZip(event.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
          className="mt-1 w-full rounded-lg border border-stone-300 p-3 text-lg font-semibold tracking-wide"
        />
        <p className="mt-2 text-sm font-semibold text-slate-900">
          Based on your ZIP {originZip || '—'}, here {ranked.length === 1 ? 'is' : 'are'}{' '}
          {ranked.length} screening {ranked.length === 1 ? 'option' : 'options'} near you.
        </p>
        {!zipKnown && (
          <p className="mt-1 text-xs text-amber-700">
            Showing the closest demo locations to that ZIP. Distances are straight-line estimates.
          </p>
        )}
      </div>

      {showEquity && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Nearest eye specialist: about {nearestEye.distanceMiles} mi. Nearest screening camera: about{' '}
          {nearestCamera.distanceMiles} mi. A camera close to home closes the gap without the long drive.
        </div>
      )}

      <div className="flex gap-2">
        {MODES.map((item) => (
          <button
            key={item}
            onClick={() => setMode(item)}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-semibold ${
              mode === item
                ? 'bg-teal-700 text-white'
                : 'border border-stone-300 bg-white text-slate-700'
            }`}
          >
            {MODE_LABEL[item]}
          </button>
        ))}
      </div>

      <SmartCard title="Recommended option">{explainMatch(top, mode)}</SmartCard>

      <div className="space-y-3">
        {ranked.map((site) => {
          const coverageOption = bestCoverageOptionForSite(coverageNavigationOptions, site.id)
          const VenueIcon = VENUE_ICON[site.type]

          return (
            <button
              key={site.id}
              onClick={() => onSelect(site.id)}
              className="block w-full rounded-lg border border-stone-200 p-4 text-left hover:border-teal-400"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-slate-900">{site.name}</div>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  <VenueIcon className="size-3" />
                  {VENUE_LABEL[site.type]}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {site.distanceMiles} mi{site.city ? ` · ${site.city}` : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {site.nextAvailable}
                </span>
                {site.rideSupport && (
                  <span className="flex items-center gap-1">
                    <Car className="size-3.5" />
                    Ride support
                  </span>
                )}
                {site.lowCost && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="size-3.5" />
                    Low-cost
                  </span>
                )}
              </div>
              {coverageOption ? (
                <div className="mt-3 rounded-md border border-teal-100 bg-teal-50 p-3 text-xs text-slate-700">
                  <div className="flex items-center gap-1 font-bold text-teal-800">
                    <ShieldCheck className="size-3.5" />
                    Coverage & ride check
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{coverageOption.payerLabel}</div>
                  <div>Estimated: {coverageOption.estimatedPatientCost}</div>
                  <div>Navigator confirmation required</div>
                  {coverageOption.rideResourceId && <div>Ride help: {coverageOption.rideOption}</div>}
                  <div className="mt-1 font-semibold text-slate-600">
                    No real coverage adjudication or ride booking
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-[11px] font-semibold text-slate-500">
                  Cost & coverage confirmed by your navigator — not a final quote.
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
