import { BellRing, CheckCircle2, Clock3, HeartPulse, MessageSquareText, Pill, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import {
  alertCounts,
  markAlertDone,
  seedHealthAlerts,
  snoozeAlert,
  type HealthAlertType,
} from '../../lib/health-alerts'

const iconForAlert: Record<HealthAlertType, typeof Pill> = {
  medication: Pill,
  blood_pressure: HeartPulse,
  symptom_log: MessageSquareText,
}

const statusClass = {
  due: 'bg-rose-100 text-rose-900',
  upcoming: 'bg-sky-100 text-sky-900',
  completed: 'bg-emerald-100 text-emerald-900',
}

export function HealthAlertCenter() {
  const [alerts, setAlerts] = useState(seedHealthAlerts)
  const counts = alertCounts(alerts)

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <BellRing className="size-4 text-teal-700" />
            Alert Center
          </div>
          <h3 className="text-xl font-bold text-slate-950">Alerts</h3>
          <p className="mt-1 text-sm text-slate-700">
            Local reminders for medications, blood pressure checks, and symptom logging.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
        <div className="rounded-lg bg-rose-50 px-2 py-2 text-rose-900">{counts.due} due</div>
        <div className="rounded-lg bg-sky-50 px-2 py-2 text-sky-900">{counts.upcoming} upcoming</div>
        <div className="rounded-lg bg-emerald-50 px-2 py-2 text-emerald-900">{counts.completed} done</div>
      </div>

      <div className="mt-4 space-y-3">
        {alerts.map((alert) => {
          const Icon = iconForAlert[alert.type]
          const isCompleted = alert.status === 'completed'

          return (
            <article key={alert.id} className="rounded-lg border border-stone-200 p-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-teal-50 p-2 text-teal-800">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-950">{alert.title}</p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusClass[alert.status]}`}>
                      {alert.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{alert.detail}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Clock3 className="size-3.5" />
                    <span>{alert.nextDueLabel}</span>
                    <span className="text-slate-400">•</span>
                    {alert.channel}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{alert.safety}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={isCompleted}
                      onClick={() => setAlerts((current) => markAlertDone(current, alert.id))}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                        isCompleted
                          ? 'cursor-not-allowed bg-stone-100 text-slate-400'
                          : 'bg-slate-900 text-white'
                      }`}
                      aria-label={`Mark ${alert.title} done`}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Mark done
                    </button>
                    {!isCompleted && (
                      <button
                        onClick={() => setAlerts((current) => snoozeAlert(current, alert.id))}
                        className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-3 py-2 text-xs font-bold text-slate-700"
                        aria-label={`Snooze ${alert.title}`}
                      >
                        <Clock3 className="size-3.5" />
                        Snooze
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
          <ShieldCheck className="size-4" />
          Reminder safety
        </div>
        <p className="mt-1 text-xs text-slate-700">
          This alert center supports routines and symptom logs. It does not diagnose, change
          medication doses, or replace clinician instructions.
        </p>
      </div>
    </section>
  )
}
