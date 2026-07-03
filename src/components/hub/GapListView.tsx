import { useState } from 'react'
import { useStore } from '../../store/useStore'
import type { GapStatus, PriorityLabel } from '../../types'

export const statusChip = (status: GapStatus): string =>
  ({
    overdue: 'Overdue',
    engaged: 'Engaged',
    scheduled: 'Scheduled',
    completed: 'Completed',
    closed: 'Gap closed',
    referral: 'Referral',
    repeat: 'Repeat needed',
  })[status]

export const priorityChip = (priority: PriorityLabel): string =>
  ({
    urgent_follow_up: 'Urgent follow-up',
    likely_barrier: 'Likely barrier',
    app_engaged: 'App engaged',
    navigator_needed: 'Navigator needed',
  })[priority]

export function GapListView() {
  const patients = useStore((state) => state.patients)
  const gaps = useStore((state) => state.gaps)
  const [county, setCounty] = useState('all')
  const counties = ['all', ...Array.from(new Set(patients.map((patient) => patient.county)))]
  const rows = patients
    .map((patient) => ({ patient, gap: gaps.find((gap) => gap.patientId === patient.id)! }))
    .filter((row) => county === 'all' || row.patient.county === county)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-extrabold">Gap list</h2>
        <select
          value={county}
          onChange={(event) => setCounty(event.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
        >
          {counties.map((item) => (
            <option key={item} value={item}>
              {item === 'all' ? 'All counties' : item}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto md:overflow-visible">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Patient</th>
              <th>County</th>
              <th>Last screening</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Next task</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ patient, gap }) => (
              <tr key={patient.id} className="border-b border-stone-100 last:border-0">
                <td className="py-2 font-semibold text-slate-900">{patient.name}</td>
                <td className="text-slate-600">{patient.county}</td>
                <td className="text-slate-600">{gap.lastScreeningDate}</td>
                <td>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold">
                    {statusChip(gap.status)}
                  </span>
                </td>
                <td>
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">
                    {priorityChip(gap.priorityLabel)}
                  </span>
                </td>
                <td className="text-slate-600">
                  {gap.priorityLabel === 'navigator_needed'
                    ? 'Navigator outreach'
                    : gap.status === 'scheduled'
                      ? 'Await screening'
                      : gap.status === 'closed'
                        ? 'Annual reminder'
                        : 'Patient engagement'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
