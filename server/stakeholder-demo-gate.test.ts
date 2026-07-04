import { describe, expect, it } from 'vitest'

import { runStakeholderDemoGate } from './stakeholder-demo-gate'

describe('runStakeholderDemoGate', () => {
  it('passes the no-PHI stakeholder demo readiness contract', () => {
    const report = runStakeholderDemoGate()

    expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'stakeholder_demo_has_no_demo_blockers',
      'stakeholder_demo_real_phi_flag_is_off',
      'stakeholder_demo_target_is_no_phi',
      'stakeholder_demo_phases_allow_only_real_phi_blockers',
      'stakeholder_demo_health_info_gates_are_real_phi_only',
    ])
  })

  it('fails when real-PHI is enabled', () => {
    const report = runStakeholderDemoGate({ RHTP_REAL_PHI: '1' })

    expect(report.summary.ok).toBe(false)
    expect(report.cases.find((testCase) => testCase.id === 'stakeholder_demo_real_phi_flag_is_off')).toMatchObject({
      ok: false,
      detail: 'RHTP_REAL_PHI=1',
    })
  })
})
