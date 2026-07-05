import { FileText, HelpCircle, ShieldCheck } from 'lucide-react'
import { HERO_ID } from '../../data/seed'
import { findPlainLanguageExplainerForPatient } from '../../lib/plain-language-explainer'
import { useStore } from '../../store/useStore'

export function AfterVisitExplainerScreen() {
  const explainers = useStore((state) => state.plainLanguageExplainers)
  const explainer = findPlainLanguageExplainerForPatient(explainers, HERO_ID)

  if (!explainer) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-extrabold text-slate-900">After-visit explainer</h1>
        <p className="text-sm text-slate-700">No explainer is available in this demo state.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-slate-900 p-4 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold text-teal-100">
          <FileText className="size-4" />
          plain-language summary
        </div>
        <h1 className="mt-2 text-2xl font-bold">{explainer.title}</h1>
        <p className="mt-2 text-sm text-slate-200">{explainer.sourceDocumentLabel}</p>
        <p className="mt-2 text-xs font-semibold text-teal-100">
          Source: KHIE discharge demo DocumentReference
        </p>
      </section>

      <div className="space-y-3">
        {explainer.sections.map((section) => (
          <article key={section.id} className="rounded-lg border border-stone-200 bg-white p-4">
            <h2 className="text-base font-bold text-slate-950">{section.title}</h2>
            <p className="mt-1 text-sm text-slate-700">{section.body}</p>
            <p className="mt-2 text-xs font-semibold text-teal-800">
              Cited from {section.citationIds.join(', ')}
            </p>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-sky-100 bg-sky-50 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-sky-950">
          <HelpCircle className="size-4" />
          Questions to ask
        </div>
        <div className="mt-3 space-y-2">
          {explainer.questions.map((question) => (
            <div key={question.id} className="rounded-lg bg-white p-3">
              <p className="text-sm font-bold text-slate-950">{question.question}</p>
              <p className="mt-1 text-sm text-slate-700">{question.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
          <ShieldCheck className="size-4" />
          Demo safety
        </div>
        <p className="mt-1 text-xs text-slate-700">{explainer.safetyBoundary}</p>
        <p className="mt-2 text-xs font-bold text-slate-700">
          No real HIE document retrieved. This does not replace your discharge instructions.
        </p>
      </section>
    </div>
  )
}
