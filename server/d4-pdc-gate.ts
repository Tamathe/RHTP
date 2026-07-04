import {
  PDC_DIABETES_POLICY,
  buildRefillGapInsight,
  calculateDiabetesPdc,
  classifyDiabetesMedication,
} from './pdc-adherence'

export interface D4PdcGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface D4PdcGateReport {
  cases: D4PdcGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

export function runD4PdcGate(): D4PdcGateReport {
  const overlap = calculateDiabetesPdc({
    patientId: 'patient_d4',
    measurementYear: 2026,
    claims: [
      { id: 'claim_1', medicationName: 'metformin', dateOfService: '2026-01-01', daysSupply: 30 },
      { id: 'claim_2', medicationName: 'metformin', dateOfService: '2026-01-20', daysSupply: 30 },
    ],
  })
  const adherent = calculateDiabetesPdc({
    patientId: 'patient_d4',
    measurementYear: 2026,
    claims: [
      { id: 'claim_1', medicationName: 'metformin', dateOfService: '2026-01-01', daysSupply: 150 },
      { id: 'claim_2', medicationName: 'metformin', dateOfService: '2026-05-31', daysSupply: 150 },
    ],
  })
  const refillGap = calculateDiabetesPdc({
    patientId: 'patient_d4',
    measurementYear: 2026,
    claims: [
      { id: 'claim_1', medicationName: 'sitagliptin', dateOfService: '2026-01-01', daysSupply: 125 },
      { id: 'claim_2', medicationName: 'sitagliptin', dateOfService: '2026-05-06', daysSupply: 125 },
    ],
  })
  const refillGapInsight = buildRefillGapInsight(refillGap)
  const excluded = calculateDiabetesPdc({
    patientId: 'patient_d4',
    measurementYear: 2026,
    claims: [
      { id: 'claim_1', medicationName: 'mysteryglucose', dateOfService: '2026-01-01', daysSupply: 90 },
      { id: 'claim_2', medicationName: 'insulin glargine', dateOfService: '2026-02-01', daysSupply: 90 },
    ],
  })
  const classIds = PDC_DIABETES_POLICY.medicationClasses.map((entry) => entry.id)
  const semaglutide = classifyDiabetesMedication('semaglutide')

  const cases: D4PdcGateCase[] = [
    {
      id: 'd4_policy_uses_pdc_dr_measurement_contract',
      ok:
        PDC_DIABETES_POLICY.measureId === 'pdc_diabetes' &&
        PDC_DIABETES_POLICY.thresholdPercent === 80 &&
        PDC_DIABETES_POLICY.treatmentPeriod === 'ipsd_to_measurement_year_end' &&
        PDC_DIABETES_POLICY.sameDrugOverlapStrategy === 'carry_forward',
      detail: `threshold=${PDC_DIABETES_POLICY.thresholdPercent};period=${PDC_DIABETES_POLICY.treatmentPeriod}`,
    },
    {
      id: 'd4_drug_grouping_matches_diabetes_all_class',
      ok:
        classIds.join(',') ===
          'biguanide,sulfonylurea,thiazolidinedione,dpp4_inhibitor,gip_glp1_receptor_agonist,meglitinide,sglt2_inhibitor' &&
        semaglutide.status === 'included',
      detail: classIds.join(','),
    },
    {
      id: 'd4_same_drug_overlap_carries_forward',
      ok:
        overlap.coveredDays === 60 &&
        overlap.adjustedCoverage[1]?.startDate === '2026-01-31' &&
        overlap.adjustedCoverage[1]?.endExclusive === '2026-03-02',
      detail: `coveredDays=${overlap.coveredDays};secondStart=${overlap.adjustedCoverage[1]?.startDate}`,
    },
    {
      id: 'd4_pdc_threshold_passes_at_80_percent',
      ok:
        adherent.eligible &&
        adherent.meetsThreshold &&
        adherent.coveredDays === 300 &&
        adherent.treatmentPeriodDays === 365 &&
        adherent.pdcPercent === 82.19,
      detail: `pdc=${adherent.pdcPercent};covered=${adherent.coveredDays}/${adherent.treatmentPeriodDays}`,
    },
    {
      id: 'd4_below_threshold_emits_refill_gap',
      ok:
        refillGap.eligible &&
        !refillGap.meetsThreshold &&
        refillGap.pdcPercent === 68.49 &&
        refillGapInsight?.eventType === 'insight.med.refill_gap',
      detail: `pdc=${refillGap.pdcPercent};event=${refillGapInsight?.eventType ?? 'none'}`,
    },
    {
      id: 'd4_unknown_and_insulin_claims_not_counted',
      ok:
        !excluded.eligible &&
        excluded.coveredDays === 0 &&
        excluded.reviewClaims.length === 1 &&
        excluded.exclusionClaims.length === 1,
      detail: `review=${excluded.reviewClaims.length};excluded=${excluded.exclusionClaims.length}`,
    },
    {
      id: 'd4_claims_floor_not_device_enhancement',
      ok:
        refillGapInsight?.sourceObservationType === 'pharmacy_fill_claim' &&
        refillGapInsight.derivedObservationType === 'med_pdc_daily' &&
        refillGapInsight.eventType === 'insight.med.refill_gap',
      detail: `source=${refillGapInsight?.sourceObservationType};derived=${refillGapInsight?.derivedObservationType}`,
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
