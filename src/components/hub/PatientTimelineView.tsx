import { useMemo } from 'react'
import { HERO_ID } from '../../data/seed'
import { useStore } from '../../store/useStore'

export function PatientTimelineView() {
  const timeline = useStore((state) => state.timeline)
  const patient = useStore((state) => state.patients.find((item) => item.id === HERO_ID)!)
  const ordered = useMemo(
    () =>
      timeline
        .filter((entry) => entry.patientId === HERO_ID)
        .sort((a, b) => a.seq - b.seq),
    [timeline],
  )

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-extrabold">Patient timeline - {patient.name}</h2>
      <ol className="relative space-y-4 border-l-2 border-stone-200 pl-5">
        {ordered.map((entry) => (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[27px] top-1 size-3 rounded-full bg-teal-600" />
            <span className="text-sm font-semibold text-slate-800">{entry.label}</span>
          </li>
        ))}
      </ol>
      <div className="rounded-lg border border-teal-100 bg-teal-50 p-4">
        <div className="text-xs font-bold uppercase text-teal-700">Navigator summary (Sandy)</div>
        <p className="mt-1 text-sm text-slate-700">
          {patient.name}, {patient.county} County, is overdue for diabetic retinopathy screening
          (A1C {patient.a1c}). She engaged the app and reported a transportation barrier.
          Suggested outreach: "Hi {patient.name.split(' ')[0]}, this is your care team - we can
          arrange a Saturday ride to the mobile screening. Does that work?"
        </p>
      </div>
    </div>
  )
}
