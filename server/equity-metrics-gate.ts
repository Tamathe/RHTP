import { PROTOCOL_PACKS } from '../src/lib/protocol-packs'
import {
  detectEquityAlarms,
  projectEquitySnapshots,
  validateClaimsFloorForDeviceMetric,
} from '../src/lib/equity-metrics'
import { createInitialBackendState } from './state'

export interface EquityMetricsGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface EquityMetricsGateReport {
  cases: EquityMetricsGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

function hasRuntimePatientId(value: object): boolean {
  return 'patientId' in value
}

export function runEquityMetricsGate(): EquityMetricsGateReport {
  const state = createInitialBackendState()
  const snapshots = state.data.metricSnapshots
  const projection = projectEquitySnapshots(snapshots)
  const computedAlarms = detectEquityAlarms(snapshots)
  const expectedMetricKeys = PROTOCOL_PACKS.flatMap((pack) =>
    pack.outcomeMetrics.map((metric) => `${pack.packId}:${metric.metricId}`),
  )
  const snapshotMetricKeys = new Set(snapshots.map((snapshot) => `${snapshot.packId}:${snapshot.metricId}`))
  const missingMetricKeys = expectedMetricKeys.filter((key) => !snapshotMetricKeys.has(key))
  const deviceFloorFailure = validateClaimsFloorForDeviceMetric({
    metricId: 'pdc_diabetes',
    stratum: 'device_owner',
    claimsFloorPresent: false,
  })
  const deviceOwnerAlarms = computedAlarms.filter(
    (alarm) => alarm.metricId === 'pdc_diabetes' && alarm.stratum === 'device_owner',
  )
  const visibleSmallCells = projection.visible.filter(
    (snapshot) => snapshot.scope !== 'cohort' && snapshot.denominator < 11,
  )
  const allAlarms = [...state.data.equityAlarms, ...computedAlarms]

  const cases: EquityMetricsGateCase[] = [
    {
      id: 'equity_snapshots_are_synthetic_aggregate_rows',
      ok: snapshots.length > 0 && snapshots.every((snapshot) => snapshot.synthetic && !hasRuntimePatientId(snapshot)),
      detail: `snapshots=${snapshots.length};synthetic=${snapshots.every((snapshot) => snapshot.synthetic)}`,
    },
    {
      id: 'outcome_metrics_have_stratified_snapshots',
      ok: missingMetricKeys.length === 0 && snapshots.some((snapshot) => snapshot.scope !== 'cohort'),
      detail: missingMetricKeys.length === 0 ? `metrics=${expectedMetricKeys.length}` : missingMetricKeys.join(','),
    },
    {
      id: 'small_cells_suppressed_at_projection',
      ok: projection.suppressed.length > 0 && visibleSmallCells.length === 0,
      detail: `suppressed=${projection.suppressed.length};visibleSmallCells=${visibleSmallCells.length}`,
    },
    {
      id: 'device_owner_disparity_raises_program_alarm',
      ok:
        deviceOwnerAlarms.length === 1 &&
        deviceOwnerAlarms[0].disparityRatio === 0.4 &&
        deviceOwnerAlarms[0].programReviewOnly,
      detail:
        deviceOwnerAlarms.length === 1
          ? `ratio=${deviceOwnerAlarms[0].disparityRatio};programReviewOnly=${deviceOwnerAlarms[0].programReviewOnly}`
          : `alarms=${deviceOwnerAlarms.length}`,
    },
    {
      id: 'device_metric_requires_claims_floor',
      ok: !deviceFloorFailure.ok && deviceFloorFailure.reason === 'device_owner_metric_requires_claims_floor',
      detail: deviceFloorFailure.ok ? 'unexpected pass' : deviceFloorFailure.reason,
    },
    {
      id: 'equity_outputs_are_program_review_only',
      ok:
        allAlarms.length > 0 &&
        allAlarms.every((alarm) => alarm.programReviewOnly && alarm.synthetic && !hasRuntimePatientId(alarm)),
      detail: `alarms=${allAlarms.length};programReviewOnly=${allAlarms.every((alarm) => alarm.programReviewOnly)}`,
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
