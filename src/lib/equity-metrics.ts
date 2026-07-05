import type {
  EquityAlarm,
  MetricSnapshotRow,
  MetricSnapshotScope,
} from '../types'

export type { EquityAlarm, EquityMetricStage, MetricSnapshotRow, MetricSnapshotScope } from '../types'

export const SMALL_CELL_SUPPRESSION_THRESHOLD = 11
export const EQUITY_DISPARITY_THRESHOLD = 0.8

export interface EquitySnapshotProjection {
  visible: MetricSnapshotRow[]
  suppressed: MetricSnapshotRow[]
}

export interface ClaimsFloorValidationInput {
  metricId: string
  stratum: MetricSnapshotScope
  claimsFloorPresent: boolean
}

export type ClaimsFloorValidationResult =
  | { ok: true }
  | { ok: false; reason: 'device_owner_metric_requires_claims_floor' }

function rate(row: MetricSnapshotRow): number {
  return row.denominator === 0 ? 0 : row.value / row.denominator
}

function roundedRatio(value: number): number {
  return Math.round(value * 100) / 100
}

function groupKey(row: MetricSnapshotRow): string {
  return [row.metricId, row.packId, row.stage, row.scope].join('|')
}

function alarmId(row: MetricSnapshotRow): string {
  return `alarm_${row.metricId}_${row.scope}_${row.stage}`
}

function isSmallCell(row: MetricSnapshotRow): boolean {
  return row.scope !== 'cohort' && row.denominator < SMALL_CELL_SUPPRESSION_THRESHOLD
}

export function projectEquitySnapshots(rows: MetricSnapshotRow[]): EquitySnapshotProjection {
  const visible: MetricSnapshotRow[] = []
  const suppressed: MetricSnapshotRow[] = []

  for (const row of rows) {
    if (isSmallCell(row)) {
      suppressed.push({
        ...row,
        suppressed: true,
        suppressionReason: 'small_cell_denominator_below_11',
      })
    } else {
      const safeRow = { ...row }
      delete safeRow.suppressed
      delete safeRow.suppressionReason
      visible.push(safeRow)
    }
  }

  return { visible, suppressed }
}

export function detectEquityAlarms(rows: MetricSnapshotRow[]): EquityAlarm[] {
  const { visible } = projectEquitySnapshots(rows)
  const groups = new Map<string, MetricSnapshotRow[]>()

  for (const row of visible) {
    if (row.scope === 'cohort') continue
    groups.set(groupKey(row), [...(groups.get(groupKey(row)) ?? []), row])
  }

  const alarms: EquityAlarm[] = []

  for (const groupedRows of groups.values()) {
    if (groupedRows.length < 2) continue

    const rates = groupedRows.map(rate)
    const maxRate = Math.max(...rates)
    const minRate = Math.min(...rates)
    const disparityRatio = maxRate === 0 ? 1 : roundedRatio(minRate / maxRate)
    const claimsFloorPresent =
      groupedRows[0].scope !== 'device_owner' || groupedRows.every((row) => row.claimsFloorPresent === true)

    if (disparityRatio < EQUITY_DISPARITY_THRESHOLD && claimsFloorPresent) {
      const firstRow = groupedRows[0]
      alarms.push({
        id: alarmId(firstRow),
        metricId: firstRow.metricId,
        packId: firstRow.packId,
        stage: firstRow.stage,
        stratum: firstRow.scope,
        disparityRatio,
        threshold: EQUITY_DISPARITY_THRESHOLD,
        claimsFloorPresent,
        sourceSnapshotIds: groupedRows.map((row) => row.id),
        programReviewOnly: true,
        synthetic: groupedRows.every((row) => row.synthetic),
      })
    }
  }

  return alarms
}

export function validateClaimsFloorForDeviceMetric(
  input: ClaimsFloorValidationInput,
): ClaimsFloorValidationResult {
  if (input.stratum === 'device_owner' && !input.claimsFloorPresent) {
    return { ok: false, reason: 'device_owner_metric_requires_claims_floor' }
  }

  return { ok: true }
}
