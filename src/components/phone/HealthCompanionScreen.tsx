import { Activity, Bot, HeartPulse, Pill, Radio, ShieldCheck, Smartphone } from 'lucide-react'
import { useState } from 'react'
import {
  getHealthCompanionSection,
  healthCompanionSections,
  type HealthCompanionSectionId,
} from '../../lib/longitudinal-health'

const iconForSection: Record<HealthCompanionSectionId, typeof HeartPulse> = {
  'blood-pressure': HeartPulse,
  glucose: Activity,
  medications: Pill,
  'ask-sandy': Bot,
}

const shortLabel: Record<HealthCompanionSectionId, string> = {
  'blood-pressure': 'Blood pressure',
  glucose: 'Glucose',
  medications: 'Meds',
  'ask-sandy': 'Ask Sandy',
}

export function HealthCompanionScreen() {
  const [selected, setSelected] = useState<HealthCompanionSectionId>('blood-pressure')
  const section = getHealthCompanionSection(selected)
  const SectionIcon = iconForSection[section.id]

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-slate-900 p-4 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold text-teal-100">
          <Radio className="size-4" />
          Longitudinal health companion
        </div>
        <h2 className="mt-2 text-2xl font-bold">Your health signals</h2>
        <p className="mt-2 text-sm text-slate-200">
          Sandy can teach, organize device trends, track medications, and help prepare the next
          right follow-up from your patient-owned health history.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-2">
        {healthCompanionSections.map((candidate) => {
          const Icon = iconForSection[candidate.id]
          const isActive = candidate.id === selected

          return (
            <button
              key={candidate.id}
              onClick={() => setSelected(candidate.id)}
              className={`flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold ${
                isActive
                  ? 'border-teal-700 bg-teal-700 text-white'
                  : 'border-stone-200 bg-white text-slate-700'
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{shortLabel[candidate.id]}</span>
            </button>
          )
        })}
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-teal-50 p-2 text-teal-800">
            <SectionIcon className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-teal-700">{section.eyebrow}</p>
            <h3 className="text-xl font-bold text-slate-950">{section.title}</h3>
            <p className="mt-1 text-sm text-slate-700">{section.summary}</p>
          </div>
        </div>

        {section.device && (
          <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50 p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-sky-950">
              <Smartphone className="size-4" />
              {section.device.name}
            </div>
            <p className="mt-1 text-sm text-slate-700">{section.device.detail}</p>
            <button className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sky-800 px-3 py-2 text-xs font-bold text-white">
              <Smartphone className="size-4" />
              Connect simulated device
            </button>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {section.lessons.map((lesson) => (
            <div key={lesson} className="rounded-lg bg-stone-50 p-3 text-sm text-slate-700">
              {lesson}
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {section.insights.map((insight) => (
            <article key={insight.label} className="rounded-lg border border-teal-100 bg-teal-50 p-3">
              <p className="text-sm font-bold text-teal-950">{insight.label}</p>
              <p className="mt-1 text-sm text-slate-700">{insight.detail}</p>
              <p className="mt-2 text-sm font-semibold text-teal-900">{insight.suggestedAction}</p>
            </article>
          ))}
        </div>

        {section.medications && (
          <div className="mt-4 space-y-2">
            {section.medications.map((medication) => (
              <div key={medication.name} className="rounded-lg border border-stone-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-950">{medication.name}</p>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-bold text-slate-700">
                    {medication.schedule}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{medication.support}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
            <ShieldCheck className="size-4" />
            Safety boundary
          </div>
          <p className="mt-1 text-xs text-slate-700">{section.safety}</p>
        </div>
      </section>

      <section className="rounded-lg border border-violet-100 bg-violet-50 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-violet-950">
          <Bot className="size-4" />
          Ask Sandy with your context
        </div>
        <div className="mt-3 space-y-2">
          {section.sandyPrompts.map((prompt) => (
            <button
              key={prompt}
              className="block w-full rounded-lg bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
