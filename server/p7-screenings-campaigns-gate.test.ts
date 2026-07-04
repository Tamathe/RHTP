import { describe, expect, it } from 'vitest'

import { runP7ScreeningsCampaignsGate } from './p7-screenings-campaigns-gate'

describe('runP7ScreeningsCampaignsGate', () => {
  it('passes the local P7 screenings and campaigns cases', () => {
    const report = runP7ScreeningsCampaignsGate()

    expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'p7_locked_screening_items_byte_identical',
      'p7_scoring_is_deterministic',
      'p7_crisis_route_is_rule_based',
      'p7_sdoh_flags_are_assistive_only',
      'p7_campaign_reuses_barrier_task_shape',
    ])
  })
})
