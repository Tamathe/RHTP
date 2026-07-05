import { describe, expect, it } from 'vitest'

import { HERO_ID, seed } from '../data/seed'
import {
  findPlainLanguageExplainerForPatient,
  plainLanguageExplainerIsPrototypeSafe,
  summarizePlainLanguageExplainer,
} from './plain-language-explainer'

describe('plain-language explainer helpers', () => {
  it('finds a synthetic cited discharge explainer for the hero patient', () => {
    const explainer = findPlainLanguageExplainerForPatient(seed.plainLanguageExplainers, HERO_ID)

    expect(explainer?.title).toBe('After-visit explainer')
    expect(explainer?.sourceDocumentRef).toBe('DocumentReference/ruth_discharge_demo')
    expect(explainer?.patientDataIncluded).toBe(false)
    expect(explainer?.sections.length).toBeGreaterThanOrEqual(3)
  })

  it('keeps the discharge explainer prototype safe', () => {
    const explainer = seed.plainLanguageExplainers[0]

    expect(plainLanguageExplainerIsPrototypeSafe(explainer)).toBe(true)
    expect(summarizePlainLanguageExplainer(explainer)).toEqual({
      citedQuestionCount: 2,
      citedSectionCount: 3,
      hasSafetyBoundary: true,
      realHieBlocked: true,
      sourceFactCount: 1,
    })
  })
})
