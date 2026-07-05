import type { PlainLanguageExplainer } from '../types'

const REQUIRED_BLOCKERS = ['prototype_no_real_hie_document', 'prototype_no_medical_advice'] as const

export interface PlainLanguageExplainerSummary {
  citedQuestionCount: number
  citedSectionCount: number
  hasSafetyBoundary: boolean
  realHieBlocked: boolean
  sourceFactCount: number
}

export function plainLanguageExplainerIsPrototypeSafe(explainer: PlainLanguageExplainer): boolean {
  return (
    explainer.synthetic &&
    explainer.patientDataIncluded === false &&
    explainer.sourceDocumentRef.startsWith('DocumentReference/') &&
    explainer.sourceFactIds.length > 0 &&
    explainer.sections.length > 0 &&
    explainer.sections.every((section) => section.citationIds.length > 0) &&
    explainer.questions.every((question) => question.citationIds.length > 0) &&
    explainer.safetyBoundary.trim().length > 0 &&
    REQUIRED_BLOCKERS.every((blocker) => explainer.blockers.includes(blocker))
  )
}

export function findPlainLanguageExplainerForPatient(
  explainers: PlainLanguageExplainer[],
  patientId: string,
): PlainLanguageExplainer | undefined {
  return explainers.find((explainer) => explainer.patientId === patientId)
}

export function summarizePlainLanguageExplainer(
  explainer: PlainLanguageExplainer,
): PlainLanguageExplainerSummary {
  return {
    citedQuestionCount: explainer.questions.filter((question) => question.citationIds.length > 0).length,
    citedSectionCount: explainer.sections.filter((section) => section.citationIds.length > 0).length,
    hasSafetyBoundary: explainer.safetyBoundary.trim().length > 0,
    realHieBlocked: REQUIRED_BLOCKERS.every((blocker) => explainer.blockers.includes(blocker)),
    sourceFactCount: explainer.sourceFactIds.length,
  }
}
