import { useState } from 'react'
import { Send } from 'lucide-react'
import { HERO_ID } from '../../data/seed'
import { withDistances } from '../../lib/ky-geo'
import { useStore } from '../../store/useStore'
import type { BarrierType } from '../../types'
import { KentuckyResourceFinder } from './KentuckyResourceFinder'

const BARRIERS: { type: BarrierType; label: string; detail: string }[] = [
  { type: 'transportation', label: 'Need a ride', detail: 'No weekday ride; family works' },
  { type: 'cost', label: 'Worried about cost', detail: 'Wants coverage confirmed first' },
  { type: 'after_hours', label: 'Need after-hours option', detail: 'Cannot attend weekday hours' },
  { type: 'not_ready', label: 'Not ready yet', detail: 'Wants to think about it' },
]

export function PlanBuilderScreen({ onDone }: { onDone: () => void }) {
  const reportBarrier = useStore((state) => state.reportBarrier)
  const reportAlreadyCompleted = useStore((state) => state.reportAlreadyCompleted)
  const scheduleScreening = useStore((state) => state.scheduleScreening)
  const sites = useStore((state) => state.sites)
  const selectedSiteId = useStore((state) => state.selectedSiteId)
  const originZip = useStore((state) => state.originZip)
  const patient = useStore((state) => state.patients.find((candidate) => candidate.id === HERO_ID))
  const [flash, setFlash] = useState<string | null>(null)

  const chosen =
    sites.find((site) => site.id === selectedSiteId) ??
    sites.find((site) => site.id === 'site_fqhc_mobile') ??
    sites[0]
  const site = withDistances([chosen], originZip)[0]

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-extrabold text-slate-900">Build your plan</h1>
      <div className="rounded-lg border border-stone-200 p-4">
        <div className="font-bold text-slate-900">{site.name}</div>
        <div className="text-sm text-slate-600">
          {site.nextAvailable} | {site.distanceMiles} miles
          {site.city ? ` | ${site.city}` : ''}
          {site.rideSupport ? ' | ride support' : ''}
        </div>
        <button
          onClick={() => {
            scheduleScreening(HERO_ID, site.id, site.nextAvailable)
            onDone()
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 font-bold text-white hover:bg-teal-800"
        >
          <Send className="size-4" /> Request this time
        </button>
        <p className="mt-2 text-xs text-slate-600">
          This sends a request. Your navigator confirms the slot and your coverage before it is final.
        </p>
      </div>

      <div>
        <div className="mb-2 text-sm font-bold text-slate-700">Something in the way?</div>
        <div className="grid grid-cols-2 gap-2">
          {BARRIERS.map((barrier) => (
            <button
              key={barrier.type}
              onClick={() => {
                reportBarrier(HERO_ID, barrier.type, barrier.detail)
                setFlash(`Sent to your navigator: ${barrier.label.toLowerCase()}.`)
              }}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-teal-400"
            >
              {barrier.label}
            </button>
          ))}
          <button
            onClick={() => {
              reportAlreadyCompleted(HERO_ID)
              setFlash(
                'Thanks - your navigator will confirm this screening with source records before the gap is closed.',
              )
            }}
            className="col-span-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-teal-400"
          >
            Already completed
          </button>
        </div>
      </div>

      <KentuckyResourceFinder patientId={HERO_ID} county={patient?.county ?? 'Perry'} />

      {flash && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {flash}
        </div>
      )}
    </div>
  )
}
