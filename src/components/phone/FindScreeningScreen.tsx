import { useState } from 'react'
import { Car, Clock, DollarSign, MapPin, ShieldCheck } from 'lucide-react'
import { bestCoverageOptionForSite } from '../../lib/coverage-logistics'
import { explainMatch, rankSites, type MatchMode } from '../../lib/site-matching'
import { useStore } from '../../store/useStore'
import { SmartCard } from './SmartCard'

const MODES: MatchMode[] = ['best', 'fastest', 'closest']
const MODE_LABEL: Record<MatchMode, string> = {
  best: 'Best match',
  fastest: 'Fastest',
  closest: 'Closest',
}

export function FindScreeningScreen({ onSelect }: { onSelect: (siteId: string) => void }) {
  const sites = useStore((state) => state.sites)
  const coverageNavigationOptions = useStore((state) => state.coverageNavigationOptions)
  const [mode, setMode] = useState<MatchMode>('best')
  const ranked = rankSites(sites, mode)
  const top = ranked[0]

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-extrabold text-slate-900">Find screening</h1>
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

          return (
            <button
              key={site.id}
              onClick={() => onSelect(site.id)}
              className="block w-full rounded-lg border border-stone-200 p-4 text-left hover:border-teal-400"
            >
              <div className="font-bold text-slate-900">{site.name}</div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {site.distanceMiles} mi
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
              {coverageOption && (
                <div className="mt-3 rounded-md border border-teal-100 bg-teal-50 p-3 text-xs text-slate-700">
                  <div className="flex items-center gap-1 font-bold text-teal-800">
                    <ShieldCheck className="size-3.5" />
                    Coverage & ride check
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{coverageOption.payerLabel}</div>
                  <div>{coverageOption.estimatedPatientCost}</div>
                  <div>Navigator confirmation required</div>
                  {coverageOption.rideResourceId && <div>Ride help: {coverageOption.rideOption}</div>}
                  <div className="mt-1 font-semibold text-slate-600">
                    No real coverage adjudication or ride booking
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
