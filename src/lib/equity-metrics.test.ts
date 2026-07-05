import { describe, expect, it } from 'vitest'

import {
  detectEquityAlarms,
  projectEquitySnapshots,
  validateClaimsFloorForDeviceMetric,
  type MetricSnapshotRow,
} from './equity-metrics'

const rows: MetricSnapshotRow[] = [
  {
    id: 'metric_pdc_device_owner',
    metricId: 'pdc_diabetes',
    packId: 'pdc_adherence',
    stage: 'outcome_rate',
    scope: 'device_owner',
    stratum: 'device_owner',
    value: 10,
    denominator: 12,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
    claimsFloorPresent: true,
  },
  {
    id: 'metric_pdc_no_device',
    metricId: 'pdc_diabetes',
    packId: 'pdc_adherence',
    stage: 'outcome_rate',
    scope: 'device_owner',
    stratum: 'no_device_owner',
    value: 6,
    denominator: 18,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
    claimsFloorPresent: true,
  },
  {
    id: 'metric_county_visible',
    metricId: 'eye_exam',
    packId: 'retinopathy',
    stage: 'gap_closure_rate',
    scope: 'county',
    stratum: 'Perry',
    value: 8,
    denominator: 14,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
  },
  {
    id: 'metric_small_cell',
    metricId: 'eye_exam',
    packId: 'retinopathy',
    stage: 'gap_closure_rate',
    scope: 'county',
    stratum: 'Harlan',
    value: 2,
    denominator: 7,
    capturedAt: '2026-07-04T09:00:00',
    synthetic: true,
  },
]

describe('equity metric projection', () => {
  it('suppresses small cells before rows become visible', () => {
    const projection = projectEquitySnapshots(rows)

    expect(projection.visible.every((row) => !row.suppressed)).toBe(true)
    expect(projection.visible.map((row) => row.id)).not.toContain('metric_small_cell')
    expect(projection.suppressed.map((row) => row.id)).toContain('metric_small_cell')
    expect(projection.suppressed[0]).toMatchObject({
      suppressed: true,
      suppressionReason: 'small_cell_denominator_below_11',
    })
  })

  it('raises a deterministic device-owner disparity alarm when the claims floor is present', () => {
    expect(detectEquityAlarms(rows)).toEqual([
      expect.objectContaining({
        metricId: 'pdc_diabetes',
        packId: 'pdc_adherence',
        stage: 'outcome_rate',
        stratum: 'device_owner',
        disparityRatio: 0.4,
        threshold: 0.8,
        claimsFloorPresent: true,
        programReviewOnly: true,
        synthetic: true,
      }),
    ])
  })

  it('requires a claims floor for device-owner metrics', () => {
    expect(
      validateClaimsFloorForDeviceMetric({
        metricId: 'pdc_diabetes',
        stratum: 'device_owner',
        claimsFloorPresent: false,
      }),
    ).toEqual({
      ok: false,
      reason: 'device_owner_metric_requires_claims_floor',
    })
  })
})
