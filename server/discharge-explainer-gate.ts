import { plainLanguageExplainerIsPrototypeSafe } from '../src/lib/plain-language-explainer'
import { createInitialBackendState } from './state'

export interface DischargeExplainerGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface DischargeExplainerGateReport {
  cases: DischargeExplainerGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

export function runDischargeExplainerGate(): DischargeExplainerGateReport {
  const state = createInitialBackendState()
  const explainer = state.data.plainLanguageExplainers[0]
  const sourceFactIds = new Set(state.data.sourceFacts.map((fact) => fact.id))
  const linkedSourceFacts =
    explainer?.sourceFactIds.filter((sourceFactId) => sourceFactIds.has(sourceFactId)) ?? []
  const citedIds = new Set([
    ...(explainer?.sections.flatMap((section) => section.citationIds) ?? []),
    ...(explainer?.questions.flatMap((question) => question.citationIds) ?? []),
  ])
  const allCitationsResolve = [...citedIds].every((citationId) =>
    explainer?.sourceFactIds.includes(citationId),
  )

  const cases: DischargeExplainerGateCase[] = [
    {
      id: 'discharge_explainer_is_synthetic_no_phi',
      ok: explainer !== undefined && explainer.synthetic && explainer.patientDataIncluded === false,
      detail:
        explainer === undefined
          ? 'missing explainer'
          : `synthetic=${explainer.synthetic};patientData=${explainer.patientDataIncluded}`,
    },
    {
      id: 'discharge_explainer_links_document_reference',
      ok:
        explainer !== undefined &&
        explainer.sourceDocumentRef.startsWith('DocumentReference/') &&
        linkedSourceFacts.length === explainer.sourceFactIds.length &&
        linkedSourceFacts.length > 0,
      detail:
        explainer === undefined
          ? 'missing explainer'
          : `document=${explainer.sourceDocumentRef};sourceFacts=${linkedSourceFacts.length}`,
    },
    {
      id: 'discharge_explainer_sections_and_questions_are_cited',
      ok:
        explainer !== undefined &&
        explainer.sections.length >= 3 &&
        explainer.questions.length >= 2 &&
        allCitationsResolve,
      detail:
        explainer === undefined
          ? 'missing explainer'
          : `sections=${explainer.sections.length};questions=${explainer.questions.length}`,
    },
    {
      id: 'discharge_explainer_has_patient_safety_boundary',
      ok:
        explainer !== undefined &&
        /does not replace/i.test(explainer.safetyBoundary) &&
        /care team/i.test(explainer.safetyBoundary),
      detail: explainer === undefined ? 'missing explainer' : explainer.safetyBoundary,
    },
    {
      id: 'real_hie_retrieval_and_medical_advice_stay_blocked',
      ok: explainer !== undefined && plainLanguageExplainerIsPrototypeSafe(explainer),
      detail: explainer === undefined ? 'missing explainer' : `blockers=${explainer.blockers.join(',')}`,
    },
  ]
  const passed = cases.filter((testCase) => testCase.ok).length

  return {
    cases,
    summary: {
      ok: passed === cases.length,
      passed,
      total: cases.length,
    },
  }
}
