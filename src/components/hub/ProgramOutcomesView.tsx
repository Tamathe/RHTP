import { useStore } from '../../store/useStore'

export function ProgramOutcomesView() {
  const metrics = useStore((state) => state.metrics)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-extrabold">Program outcomes</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.id} className="rounded-lg border border-stone-200 bg-white p-4">
            <div className="text-3xl font-extrabold text-slate-900">
              {metric.value}
              {metric.denominator ? (
                <span className="text-lg text-slate-400">/{metric.denominator}</span>
              ) : null}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-600">{metric.label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-teal-100 bg-teal-50 p-4 text-sm text-slate-700">
        <span className="font-bold text-teal-700">Program narrative (Sandy): </span>
        Contact is strong across the cohort and scheduling is improving. The main attrition point
        is between "scheduled" and "completed" - transportation is the most common barrier. Perry
        County sites with ride support are closing gaps fastest; consider extending ride support to
        neighboring counties.
      </div>
    </div>
  )
}
