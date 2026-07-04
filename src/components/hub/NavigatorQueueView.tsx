import { useMemo } from 'react'
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  ClipboardList,
  Database,
  ShieldCheck,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { NavigatorQueuePriority, NavigatorQueueReason, ProtocolEvent, SourceFact } from '../../types'

const priorityClass: Record<NavigatorQueuePriority, string> = {
  routine: 'bg-slate-100 text-slate-700',
  soon: 'bg-amber-100 text-amber-900',
  urgent: 'bg-red-100 text-red-900',
}

const reasonLabel: Record<NavigatorQueueReason, string> = {
  transportation_barrier: 'Transportation barrier',
  cost_barrier: 'Cost barrier',
  after_hours_needed: 'After-hours needed',
  patient_not_ready: 'Patient not ready',
  already_completed_needs_reconciliation: 'Already completed needs reconciliation',
  red_flag_symptom: 'Red flag symptom',
  sdoh_resource_connection: 'SDOH resource connection',
  abnormal_result_referral: 'Abnormal result referral',
  ungradable_repeat_needed: 'Ungradable repeat needed',
  nonresponse: 'Nonresponse',
  identity_match_review: 'Identity match review',
  low_confidence_identity_or_gap_match: 'Low confidence identity or gap match',
}

const eventById = (events: ProtocolEvent[], id: string): ProtocolEvent | undefined =>
  events.find((event) => event.id === id)

const sourceFactById = (facts: SourceFact[], id: string): SourceFact | undefined =>
  facts.find((fact) => fact.id === id)

const humanize = (value: string) => value.replaceAll('_', ' ')

export function NavigatorQueueView() {
  const navigatorQueue = useStore((state) => state.navigatorQueue)
  const patients = useStore((state) => state.patients)
  const protocolEvents = useStore((state) => state.protocolEvents)
  const sourceFacts = useStore((state) => state.sourceFacts)
  const completeNavigatorQueueItem = useStore((state) => state.completeNavigatorQueueItem)

  const queue = useMemo(
    () => navigatorQueue.filter((item) => item.status === 'open'),
    [navigatorQueue],
  )
  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  )

  if (queue.length === 0) {
    return (
      <section className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-center">
        <ClipboardList className="mx-auto size-8 text-teal-700" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">No open navigator work</h2>
        <p className="mt-1 text-sm text-slate-600">
          Sandy can keep handling protocol-safe outreach until a barrier, uncertainty, result, or
          red flag needs a human.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Navigator queue</h2>
        <p className="text-sm text-slate-600">Structured work returned from Sandy outreach.</p>
      </div>

      {queue.map((item) => {
        const patient = patientById.get(item.patientId)
        const sourceEvents = item.sourceEventIds
          .map((eventId) => eventById(protocolEvents, eventId))
          .filter((event): event is ProtocolEvent => Boolean(event))
        const sourceFactIds = Array.from(new Set(sourceEvents.flatMap((event) => event.sourceFactIds)))
        const facts = sourceFactIds
          .map((factId) => sourceFactById(sourceFacts, factId))
          .filter((fact): fact is SourceFact => Boolean(fact))

        return (
          <article key={item.id} className="rounded-lg border border-stone-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">{patient?.name ?? 'Unknown patient'}</h3>
                <p className="text-sm text-slate-600">{patient?.county ?? 'Unknown'} County</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${priorityClass[item.priority]}`}>
                {item.priority}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              {item.priority === 'urgent' ? (
                <AlertTriangle className="size-4" />
              ) : (
                <ClipboardList className="size-4" />
              )}
              {reasonLabel[item.reason]}
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <div className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                <Activity className="size-4 text-teal-700" />
                Protocol trail
              </div>
              {sourceEvents.length > 0 ? (
                <div className="space-y-2">
                  {sourceEvents.map((event) => (
                    <div key={event.id} className="rounded-md border border-slate-200 bg-white p-2">
                      <div className="font-semibold text-slate-900">{event.label}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-600">
                        <span>Type: {humanize(event.type)}</span>
                        <span>Status: {humanize(event.status)}</span>
                        <span>Actor: {humanize(event.actor)}</span>
                        <span>Created: {event.createdAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No protocol events are linked to this queue item yet.</p>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                Derived from the protocol/source trail above
              </div>
              <p className="mt-2 text-sm text-slate-700">{item.summary}</p>
              <p className="mt-2 text-sm font-semibold text-teal-900">{item.suggestedAction}</p>
            </div>

            <div className="mt-3 rounded-lg border border-teal-100 bg-white p-3 text-xs text-slate-700">
              <div className="mb-2 flex items-center gap-2 font-semibold text-teal-900">
                <ShieldCheck className="size-4" />
                Source facts
              </div>
              {facts.length > 0 ? (
                <div className="space-y-2">
                  {facts.map((fact) => (
                    <div key={fact.id} className="flex gap-2">
                      <Database className="mt-0.5 size-3.5 shrink-0 text-teal-700" />
                      <p>
                        <span className="font-semibold">{fact.label}:</span> {fact.value}. Source:{' '}
                        {fact.sourceName}. Retrieved {fact.retrievedAt}. Effective {fact.effectiveDate}.
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No source facts are linked to this queue item yet.</p>
              )}
            </div>

            <button
              onClick={() => completeNavigatorQueueItem(item.id)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            >
              <CheckCircle2 className="size-4" />
              Mark done
            </button>
          </article>
        )
      })}
    </section>
  )
}
