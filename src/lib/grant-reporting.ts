import type { GrantReportPacket } from '../types'

export interface GrantReportSummary {
  billingEvidenceCount: number
  deliveryBlocked: boolean
  equityAlarmCount: number
  metricCount: number
  suppressedRows: number
}

export function grantReportIsPrototypeSafe(report: GrantReportPacket): boolean {
  return (
    report.synthetic &&
    report.patientDataIncluded === false &&
    report.blockers.includes('prototype_no_real_reporting_export') &&
    report.blockers.includes('no_recipient_delivery')
  )
}

export function summarizeGrantReport(report: GrantReportPacket): GrantReportSummary {
  return {
    billingEvidenceCount: report.billingEvidenceIds.length,
    deliveryBlocked: report.blockers.includes('no_recipient_delivery'),
    equityAlarmCount: report.equityAlarmIds.length,
    metricCount: report.metricLines.length,
    suppressedRows: report.metricLines.reduce((total, metricLine) => total + metricLine.suppressedCount, 0),
  }
}
