import { describe, expect, it } from 'vitest'

import { seed } from '../data/seed'
import { grantReportIsPrototypeSafe, summarizeGrantReport } from './grant-reporting'

describe('grant reporting helpers', () => {
  it('summarizes a synthetic no-PHI stakeholder grant report packet', () => {
    const report = seed.grantReportPackets[0]

    expect(grantReportIsPrototypeSafe(report)).toBe(true)
    expect(report.title).toBe('RHTP stakeholder grant report')
    expect(report.patientDataIncluded).toBe(false)
    expect(report.recipient).toBe('RHTP stakeholder review')
    expect(report.cadence).toBe('monthly')
    expect(summarizeGrantReport(report)).toEqual({
      billingEvidenceCount: 4,
      deliveryBlocked: true,
      equityAlarmCount: 1,
      metricCount: 4,
      suppressedRows: 1,
    })
  })
})
