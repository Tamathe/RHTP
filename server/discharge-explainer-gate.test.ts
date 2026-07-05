import { describe, expect, it } from 'vitest'

import { runDischargeExplainerGate } from './discharge-explainer-gate'

describe('discharge explainer gate', () => {
  it('passes the no-PHI stakeholder-demo discharge explainer checks', () => {
    const report = runDischargeExplainerGate()

    expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'discharge_explainer_is_synthetic_no_phi',
      'discharge_explainer_links_document_reference',
      'discharge_explainer_sections_and_questions_are_cited',
      'discharge_explainer_has_patient_safety_boundary',
      'real_hie_retrieval_and_medical_advice_stay_blocked',
    ])
  })
})
