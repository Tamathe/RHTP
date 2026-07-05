import { AlertTriangle, ShieldCheck } from 'lucide-react'

import { detectEquityAlarms, projectEquitySnapshots } from '../../lib/equity-metrics'
import { useStore } from '../../store/useStore'

function percent(value: number, denominator: number): string {
  if (denominator === 0) return '0%'
  return `${Math.round((value / denominator) * 100)}%`
}

export function ProgramOutcomesView() {
  const metrics = useStore((state) => state.metrics)
  const metricSnapshots = useStore((state) => state.metricSnapshots)
  const seededEquityAlarms = useStore((state) => state.equityAlarms)
  const equityProjection = projectEquitySnapshots(metricSnapshots)
  const equityAlarms = seededEquityAlarms.length > 0 ? seededEquityAlarms : detectEquityAlarms(metricSnapshots)
  const visibleSnapshots = equityProjection.visible.filter((snapshot) => snapshot.scope !== 'cohort').slice(0, 4)

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
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-teal-700" />
          <h3 className="text-lg font-extrabold text-slate-900">Equity snapshot</h3>
        </div>
        <p className="text-sm text-slate-600">
          Synthetic aggregate demo data. These rows show how RHTP would publish metric snapshots
          after no-PHI suppression rules have run.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {visibleSnapshots.map((snapshot) => (
            <div key={snapshot.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="text-2xl font-extrabold text-slate-900">
                {percent(snapshot.value, snapshot.denominator)}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-700">
                {snapshot.metricId.replace(/_/g, ' ')} / {snapshot.stage.replace(/_/g, ' ')}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {snapshot.scope}: {snapshot.stratum ?? 'all'} ({snapshot.value}/{snapshot.denominator})
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
          <span className="font-bold text-amber-800">Small cells suppressed before display: </span>
          {equityProjection.suppressed.length} aggregate row
          {equityProjection.suppressed.length === 1 ? '' : 's'} below n&lt;11.
        </div>
        {equityAlarms.map((alarm) => (
          <div key={alarm.id} className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-slate-700">
            <div className="flex items-center gap-2 font-bold text-rose-800">
              <AlertTriangle className="size-4" />
              Program review alert
            </div>
            <p className="mt-2">
              {alarm.metricId.replace(/_/g, ' ')} has a {Math.round(alarm.disparityRatio * 100)}%
              parity ratio across {alarm.stratum.replace(/_/g, ' ')} strata. The claims floor is
              present, so this opens program review without changing any patient's care priority.
            </p>
          </div>
        ))}
      </section>
    </div>
  )
}
