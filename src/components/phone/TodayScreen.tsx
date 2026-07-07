import { ArrowRight, Eye, GraduationCap } from 'lucide-react'
import { HERO_ID } from '../../data/seed'
import { PATIENT_CHIPS } from '../../lib/ai-script'
import { useStore } from '../../store/useStore'
import { AssistantBox } from './AssistantBox'
import { SmartCard } from './SmartCard'
import { ProvenanceStrip } from './ProvenanceStrip'
import { SafetyBoundaryCard } from './SafetyBoundaryCard'

export function TodayScreen({ onNext, onLearn }: { onNext: () => void; onLearn?: () => void }) {
  const originZip = useStore((state) => state.originZip)
  const setOriginZip = useStore((state) => state.setOriginZip)

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
      <div className="rounded-lg border border-stone-200 p-4">
        <label htmlFor="today-zip" className="text-sm font-bold text-slate-700">
          Your ZIP code
        </label>
        <input
          id="today-zip"
          inputMode="numeric"
          value={originZip}
          onChange={(event) => setOriginZip(event.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
          className="mt-1 w-full rounded-lg border border-stone-300 p-3 text-lg font-semibold tracking-wide"
        />
        <button
          onClick={onNext}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-base font-bold text-white hover:bg-teal-800"
        >
          Find eye screening near me <ArrowRight className="size-5" />
        </button>
        {onLearn && (
          <button
            onClick={onLearn}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-teal-300 px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50"
          >
            <GraduationCap className="size-4" /> Learn about diabetic retinopathy
          </button>
        )}
      </div>
      <div>
        <div className="mb-2 text-sm font-bold text-slate-700">Have a question?</div>
        <AssistantBox patientId={HERO_ID} surface="today" chips={PATIENT_CHIPS} />
      </div>
    </div>
  )
}
