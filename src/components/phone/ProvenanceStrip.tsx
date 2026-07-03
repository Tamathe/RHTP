import { useMemo } from 'react'
import { Database, ShieldCheck } from 'lucide-react'
import { useStore } from '../../store/useStore'

interface ProvenanceStripProps {
  patientId: string
  labels?: string[]
}

export function ProvenanceStrip({ patientId, labels }: ProvenanceStripProps) {
  const sourceFacts = useStore((state) => state.sourceFacts)
  const matchingFacts = useMemo(
    () =>
      sourceFacts.filter(
        (fact) => fact.patientId === patientId && (!labels || labels.includes(fact.label)),
      ),
    [labels, patientId, sourceFacts],
  )

  if (matchingFacts.length === 0) return null

  return (
    <section className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-slate-700">
      <div className="mb-2 flex items-center gap-2 font-semibold text-teal-900">
        <ShieldCheck className="size-4" />
        Why Sandy can say this
      </div>
      <div className="space-y-2">
        {matchingFacts.map((fact) => (
          <div key={fact.id} className="flex gap-2">
            <Database className="mt-0.5 size-3.5 shrink-0 text-teal-700" />
            <p>
              <span className="font-semibold">{fact.label}:</span> {fact.value}. Source:{' '}
              {fact.sourceName}. Effective {fact.effectiveDate}. Retrieved {fact.retrievedAt}.
              {` `}
              {fact.confidence}.
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
