import { useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, GraduationCap } from 'lucide-react'
import { HERO_ID } from '../../data/seed'
import { RETINOPATHY_TOPICS } from '../../lib/retinopathy-education'
import { EducationAssistantBox } from './EducationAssistantBox'
import { SafetyBoundaryCard } from './SafetyBoundaryCard'

export function LearnScreen({
  onBack,
  onFind,
}: {
  onBack?: () => void
  onFind?: () => void
}) {
  const [open, setOpen] = useState<string | null>(RETINOPATHY_TOPICS[0]?.id ?? null)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-teal-700">
        <GraduationCap className="size-6" />
        <h1 className="text-lg font-extrabold">Learn: diabetic retinopathy</h1>
      </div>
      <p className="text-sm text-slate-700">
        Sandy can explain diabetic retinopathy and the screening in plain language. Tap a question,
        or ask your own.
      </p>

      <EducationAssistantBox patientId={HERO_ID} />

      <div className="space-y-2">
        <div className="text-sm font-bold text-slate-700">Learn the basics</div>
        {RETINOPATHY_TOPICS.map((topic) => {
          const isOpen = open === topic.id
          return (
            <div key={topic.id} className="overflow-hidden rounded-lg border border-stone-200">
              <button
                onClick={() => setOpen(isOpen ? null : topic.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-semibold text-slate-900 hover:bg-stone-50"
              >
                <span>{topic.title}</span>
                {isOpen ? (
                  <ChevronDown className="size-4 shrink-0 text-slate-500" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-slate-500" />
                )}
              </button>
              {isOpen && (
                <div className="border-t border-stone-100 px-4 py-3 text-sm text-slate-700">
                  {topic.body}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <SafetyBoundaryCard />

      {(onFind || onBack) && (
        <div className="space-y-2">
          {onFind && (
            <button
              onClick={onFind}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 font-bold text-white hover:bg-teal-800"
            >
              Find a screening near me <ArrowRight className="size-5" />
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-400"
            >
              <ArrowLeft className="size-4" /> Back to home
            </button>
          )}
        </div>
      )}
    </div>
  )
}
