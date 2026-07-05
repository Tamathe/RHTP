import { grantReportIsPrototypeSafe } from '../src/lib/grant-reporting'
import { createInitialBackendState } from './state'

export interface GrantReportingGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface GrantReportingGateReport {
  cases: GrantReportingGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

export function runGrantReportingGate(): GrantReportingGateReport {
  const state = createInitialBackendState()
  const report = state.data.grantReportPackets[0]
  const metricSnapshotIds = new Set(state.data.metricSnapshots.map((snapshot) => snapshot.id))
  const equityAlarmIds = new Set(state.data.equityAlarms.map((alarm) => alarm.id))
  const billingEvidenceIds = new Set(state.data.billingEvidenceRecords.map((record) => record.id))
  const missingMetricSourceIds =
    report?.metricLines.flatMap((line) => line.sourceSnapshotIds.filter((snapshotId) => !metricSnapshotIds.has(snapshotId))) ?? []
  const missingEquityAlarmIds = report?.equityAlarmIds.filter((alarmId) => !equityAlarmIds.has(alarmId)) ?? []
  const missingBillingEvidenceIds =
    report?.billingEvidenceIds.filter((evidenceId) => !billingEvidenceIds.has(evidenceId)) ?? []

  const cases: GrantReportingGateCase[] = [
    {
      id: 'grant_report_is_synthetic_no_phi',
      ok: report !== undefined && grantReportIsPrototypeSafe(report),
      detail: report === undefined ? 'missing report' : `synthetic=${report.synthetic};patientData=${report.patientDataIncluded}`,
    },
    {
      id: 'grant_report_has_recipient_cadence_and_period',
      ok:
        report !== undefined &&
        report.recipient.trim().length > 0 &&
        report.cadence === 'monthly' &&
        /^\d{4}-\d{2}$/u.test(report.reportingPeriod),
      detail:
        report === undefined
          ? 'missing report'
          : `recipient=${report.recipient};cadence=${report.cadence};period=${report.reportingPeriod}`,
    },
    {
      id: 'grant_report_metric_lines_have_sources',
      ok:
        report !== undefined &&
        report.metricLines.length >= 4 &&
        report.metricLines.every((line) => line.sourceSnapshotIds.length > 0) &&
        missingMetricSourceIds.length === 0,
      detail:
        missingMetricSourceIds.length === 0
          ? `metricLines=${report?.metricLines.length ?? 0}`
          : `missing=${missingMetricSourceIds.join(',')}`,
    },
    {
      id: 'grant_report_links_equity_and_billing_evidence',
      ok:
        report !== undefined &&
        report.equityAlarmIds.length > 0 &&
        report.billingEvidenceIds.length >= 4 &&
        missingEquityAlarmIds.length === 0 &&
        missingBillingEvidenceIds.length === 0,
      detail:
        missingEquityAlarmIds.length === 0 && missingBillingEvidenceIds.length === 0
          ? `equity=${report?.equityAlarmIds.length ?? 0};billing=${report?.billingEvidenceIds.length ?? 0}`
          : `missingEquity=${missingEquityAlarmIds.join(',')};missingBilling=${missingBillingEvidenceIds.join(',')}`,
    },
    {
      id: 'grant_report_delivery_stays_blocked',
      ok:
        report !== undefined &&
        report.blockers.includes('prototype_no_real_reporting_export') &&
        report.blockers.includes('no_recipient_delivery'),
      detail: report === undefined ? 'missing report' : `blockers=${report.blockers.join(',')}`,
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
