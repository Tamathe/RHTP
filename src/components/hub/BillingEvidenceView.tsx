import { ShieldCheck } from 'lucide-react'
import { summarizeBillingEvidence } from '../../lib/billing-artifacts'
import { useStore } from '../../store/useStore'

const codeLabels = {
  apcm: 'APCM',
  ccm: 'CCM',
  chw: 'CHW',
  rpm: 'RPM',
}

export function BillingEvidenceView() {
  const records = useStore((state) => state.billingEvidenceRecords)
  const summary = summarizeBillingEvidence(records)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold">Billing evidence</h2>
        <p className="mt-1 text-sm text-slate-600">
          Synthetic support artifacts for sustainability conversations; no claims are submitted from this prototype.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="text-2xl font-extrabold text-slate-900">{summary.totalMinutes} minutes</div>
          <div className="mt-1 text-xs font-semibold uppercase text-slate-500">documented support</div>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="text-2xl font-extrabold text-slate-900">{summary.rpmReadingDays} reading days</div>
          <div className="mt-1 text-xs font-semibold uppercase text-slate-500">RPM demo floor</div>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="text-2xl font-extrabold text-slate-900">{summary.documentedArtifacts}</div>
          <div className="mt-1 text-xs font-semibold uppercase text-slate-500">source artifacts</div>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="text-2xl font-extrabold text-slate-900">{summary.readyForReview}</div>
          <div className="mt-1 text-xs font-semibold uppercase text-slate-500">review-ready records</div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="flex items-center gap-2 font-bold">
          <ShieldCheck className="size-4" />
          Claim submission remains blocked
        </div>
        <p className="mt-1">
          These records are synthetic, local, and intended to show the evidence shape only. Real billing needs payer
          contracts, production data controls, review workflows, and compliance sign-off.
        </p>
      </div>

      <div className="space-y-3">
        {records.map((record) => (
          <article key={record.id} className="rounded-lg border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">{record.label}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {codeLabels[record.code]} | {record.month} | sources: {record.sourceEventIds.join(', ')}
                </div>
              </div>
              <div className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-slate-700">
                {record.reviewedByNavigator ? 'reviewed' : 'needs review'}
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">{record.notes}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              {record.minutes > 0 && <span>{record.minutes} min</span>}
              {record.readingDays > 0 && <span>{record.readingDays} reading days</span>}
              <span>{record.documentedArtifactIds.length} artifacts</span>
              <span>{record.blockers.join(', ')}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
