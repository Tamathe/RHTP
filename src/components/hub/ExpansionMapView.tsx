import { CheckCircle2, Circle } from 'lucide-react'

const USE_CASES = [
  { label: 'Diabetic retinopathy screening', live: true },
  { label: 'A1C follow-up', live: false },
  { label: 'Blood pressure management', live: false },
  { label: 'Medication adherence', live: false },
  { label: 'Food access', live: false },
  { label: 'Chronic-care coaching', live: false },
]

export function ExpansionMapView() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold">Expansion map</h2>
      <p className="text-sm text-slate-600">
        Retinopathy is the first use case on reusable rails: identify, explain, match, solve the
        barrier, summarize, close the loop.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {USE_CASES.map((useCase) => (
          <div
            key={useCase.label}
            className={`rounded-lg border p-4 ${
              useCase.live ? 'border-teal-300 bg-teal-50' : 'border-stone-200 bg-white'
            }`}
          >
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${
                useCase.live ? 'text-teal-700' : 'text-slate-500'
              }`}
            >
              {useCase.live ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
              {useCase.label}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {useCase.live ? 'Live in this prototype' : 'Same rails'}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400">Future hints: maternal health, dental, behavioral health, EMS.</p>
    </div>
  )
}
