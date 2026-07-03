import { ArrowRight, Eye } from 'lucide-react'
import { HERO_ID } from '../../data/seed'
import { PATIENT_CHIPS } from '../../lib/ai-script'
import { AssistantBox } from './AssistantBox'
import { SmartCard } from './SmartCard'
import { ProvenanceStrip } from './ProvenanceStrip'
import { SafetyBoundaryCard } from './SafetyBoundaryCard'

export function TodayScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-teal-700">
        <Eye className="size-6" />
        <h1 className="text-lg font-extrabold">Today</h1>
      </div>
      <div className="rounded-lg border border-stone-200 p-4">
        <div className="text-xl font-extrabold text-slate-900">
          Your diabetes eye screening is due
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Last screening on record: December 2024. A yearly eye check helps protect your vision.
        </p>
      </div>
      <SmartCard title="Why you're seeing this">
        You have diabetes, no retinal screening on record in the last 19 months, and a low-cost
        screening is available nearby.
      </SmartCard>
      <ProvenanceStrip patientId={HERO_ID} labels={['Diabetes diagnosis', 'Retinal screening gap']} />
      <SafetyBoundaryCard />
      <button
        onClick={onNext}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-800"
      >
        Find a screening location <ArrowRight className="size-5" />
      </button>
      <div>
        <div className="mb-2 text-sm font-bold text-slate-700">Have a question?</div>
        <AssistantBox patientId={HERO_ID} surface="today" chips={PATIENT_CHIPS} />
      </div>
    </div>
  )
}
