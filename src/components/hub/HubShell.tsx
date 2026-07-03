import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Activity, BarChart3, ClipboardList, Inbox, ListChecks, Map } from 'lucide-react'
import { ExpansionMapView } from './ExpansionMapView'
import { GapListView } from './GapListView'
import { NavigatorQueueView } from './NavigatorQueueView'
import { PatientTimelineView } from './PatientTimelineView'
import { ProgramOutcomesView } from './ProgramOutcomesView'
import { ReferralQueueView } from './ReferralQueueView'

export type HubView = 'queue' | 'gaps' | 'timeline' | 'referrals' | 'outcomes' | 'expansion'

const NAV: { view: HubView; label: string; Icon: LucideIcon }[] = [
  { view: 'queue', label: 'Navigator queue', Icon: ClipboardList },
  { view: 'gaps', label: 'Gap list', Icon: ListChecks },
  { view: 'timeline', label: 'Patient timeline', Icon: Activity },
  { view: 'referrals', label: 'Referral queue', Icon: Inbox },
  { view: 'outcomes', label: 'Program outcomes', Icon: BarChart3 },
  { view: 'expansion', label: 'Expansion map', Icon: Map },
]

export function HubShell() {
  const [view, setView] = useState<HubView>('queue')

  return (
    <div className="mx-auto flex max-w-6xl gap-6 p-6">
      <aside className="w-52 shrink-0 space-y-1">
        {NAV.map(({ view: item, label, Icon }) => (
          <button
            key={item}
            onClick={() => setView(item)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
              view === item ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-stone-100'
            }`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </aside>
      <main className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        {view === 'queue' && <NavigatorQueueView />}
        {view === 'gaps' && <GapListView />}
        {view === 'timeline' && <PatientTimelineView />}
        {view === 'referrals' && <ReferralQueueView />}
        {view === 'outcomes' && <ProgramOutcomesView />}
        {view === 'expansion' && <ExpansionMapView />}
      </main>
    </div>
  )
}
