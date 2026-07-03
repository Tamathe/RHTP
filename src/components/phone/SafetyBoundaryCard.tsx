import { AlertTriangle, Mic } from 'lucide-react'

export function SafetyBoundaryCard() {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-slate-700">
      <div className="mb-2 flex items-center gap-2 font-semibold text-amber-900">
        <Mic className="size-4" />
        What Sandy can safely do
      </div>
      <p>
        Sandy can help with screening steps, reminders, barriers, site choices, and navigator
        handoffs. Sandy cannot diagnose, change medicines, or reassure urgent symptoms.
      </p>
      <div className="mt-2 flex gap-2 text-amber-900">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <p>Sudden vision changes, new flashes or floaters, or eye pain go to a human reviewer.</p>
      </div>
    </section>
  )
}
