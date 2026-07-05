import { describe, expect, it } from 'vitest'

import packageJson from '../package.json'
import { runGrantReportingGate } from './grant-reporting-gate'

describe('runGrantReportingGate', () => {
  it('is exposed as an npm script', () => {
    expect(packageJson.scripts['grant:gate']).toBe('tsx scripts/rhtp-grant-reporting-gate.ts')
  })

  it('passes the local no-PHI grant reporting proof cases', () => {
    const report = runGrantReportingGate()

    expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'grant_report_is_synthetic_no_phi',
      'grant_report_has_recipient_cadence_and_period',
      'grant_report_metric_lines_have_sources',
      'grant_report_links_equity_and_billing_evidence',
      'grant_report_delivery_stays_blocked',
    ])
  })
})
