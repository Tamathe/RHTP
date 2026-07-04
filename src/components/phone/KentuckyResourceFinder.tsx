import { ExternalLink, HandHeart, MapPin, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  findKentuckyResources,
  sdohNeedOptions,
  type KentuckySdohResource,
  type SdohNeedType,
} from '../../lib/kentucky-sdoh-resources'
import { useStore } from '../../store/useStore'

interface KentuckyResourceFinderProps {
  patientId: string
  county: string
}

const referralModeLabel: Record<KentuckySdohResource['referralMode'], string> = {
  navigator_referral: 'Navigator can help',
  directory_search: 'Directory search',
  call_211: 'Call or text',
}

export function KentuckyResourceFinder({ patientId, county }: KentuckyResourceFinderProps) {
  const requestSdohResourceHelp = useStore((state) => state.requestSdohResourceHelp)
  const [selectedNeed, setSelectedNeed] = useState<SdohNeedType>('transportation')
  const [flash, setFlash] = useState<string | null>(null)
  const resources = useMemo(
    () => findKentuckyResources({ county, needType: selectedNeed }),
    [county, selectedNeed],
  )

  const requestHelp = (resource: KentuckySdohResource) => {
    requestSdohResourceHelp(patientId, resource.id, selectedNeed)
    setFlash(`Sent to your navigator: ${resource.name}.`)
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-teal-800">
            <HandHeart className="size-4" />
            Kentucky resource matches
          </div>
          <h2 className="text-lg font-extrabold text-slate-950">Find local help</h2>
          <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-600">
            <MapPin className="size-3.5" />
            {county} County
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {sdohNeedOptions.map((option) => {
          const isSelected = option.id === selectedNeed

          return (
            <button
              key={option.id}
              onClick={() => {
                setSelectedNeed(option.id)
                setFlash(null)
              }}
              className={`min-h-10 rounded-lg border px-2 py-2 text-xs font-bold ${
                isSelected
                  ? 'border-teal-700 bg-teal-700 text-white'
                  : 'border-stone-200 bg-stone-50 text-slate-700'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 space-y-3">
        {resources.map((resource) => (
          <article key={resource.id} className="rounded-lg border border-stone-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-950">{resource.name}</h3>
                <p className="mt-1 text-sm text-slate-700">{resource.summary}</p>
              </div>
              <span className="shrink-0 rounded-full bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-900">
                {referralModeLabel[resource.referralMode]}
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-700">{resource.contact}</p>
            <p className="mt-2 text-xs text-slate-500">
              <span className="font-semibold">Source:</span> {resource.sourceName}. Verified{' '}
              {resource.verifiedAt}.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={resource.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-3 py-2 text-xs font-bold text-slate-700"
              >
                <ExternalLink className="size-3.5" />
                View source
              </a>
              <button
                onClick={() => requestHelp(resource)}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                aria-label={`Ask navigator to connect with ${resource.name}`}
              >
                <HandHeart className="size-3.5" />
                Ask navigator
              </button>
            </div>
          </article>
        ))}
      </div>

      {flash && (
        <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {flash}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
          <ShieldCheck className="size-4" />
          Resource safety
        </div>
        <p className="mt-1 text-xs text-slate-700">
          Matches are a starting point. Availability and eligibility must be confirmed before
          travel, enrollment, or referral completion.
        </p>
      </div>
    </section>
  )
}
