import {
  canSdohFlagChangeCarePriority,
  createCampaignBarrierTask,
  evaluateCampaignCohort,
  isOutboundCategoryAllowed,
  raiseSdohFlag,
  routeScreeningResult,
  screeningItems,
  scoreGad7,
  scorePhq9,
} from './p7-screenings-campaigns'

export interface P7ScreeningsCampaignsGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface P7ScreeningsCampaignsGateReport {
  cases: P7ScreeningsCampaignsGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

export function runP7ScreeningsCampaignsGate(): P7ScreeningsCampaignsGateReport {
  const phq9Moderate = scorePhq9([2, 2, 2, 2, 2, 0, 0, 0, 0])
  const gad7Moderate = scoreGad7([2, 2, 2, 2, 2, 0, 0])
  const crisisRoute = routeScreeningResult({
    instrument: 'phq9',
    answers: [0, 0, 0, 0, 0, 0, 0, 0, 1],
    adversarialModelSeverity: 'none_minimal',
  })
  const passiveSdoh = raiseSdohFlag({
    patientId: 'pat_ruthann',
    domain: 'transportation',
    source: 'passive_barrier_tag',
    sourceFactIds: ['fact_transportation_barrier'],
    barrierId: 'barrier_ride',
  })
  const interpersonalSafety = raiseSdohFlag({
    patientId: 'pat_ruthann',
    domain: 'interpersonal_safety',
    source: 'prapare_intake',
    sourceFactIds: ['fact_prapare_safety'],
  })
  const campaign = evaluateCampaignCohort({
    packId: 'flu_campaign',
    patients: [
      { id: 'pat_1', age: 67, conditions: ['diabetes'], immunizations: [] },
      { id: 'pat_2', age: 31, conditions: [], immunizations: [] },
      { id: 'pat_3', age: 70, conditions: ['diabetes'], immunizations: ['flu_2026'] },
    ],
    season: '2026',
  })
  const campaignTask = createCampaignBarrierTask({
    patientId: 'pat_1',
    campaignId: campaign.id,
    barrier: 'transportation',
    sourceEventIds: ['event_campaign_enrolled'],
  })

  const cases: P7ScreeningsCampaignsGateCase[] = [
    {
      id: 'p7_locked_screening_items_byte_identical',
      ok:
        screeningItems.phq2[0]?.text === 'Little interest or pleasure in doing things' &&
        screeningItems.phq9[8]?.text ===
          'Thoughts that you would be better off dead, or of hurting yourself in some way' &&
        screeningItems.gad7[0]?.text === 'Feeling nervous, anxious, or on edge',
      detail: `phq2=${screeningItems.phq2.length};phq9=${screeningItems.phq9.length};gad7=${screeningItems.gad7.length}`,
    },
    {
      id: 'p7_scoring_is_deterministic',
      ok:
        phq9Moderate.totalScore === 10 &&
        phq9Moderate.severity === 'moderate' &&
        gad7Moderate.totalScore === 10 &&
        gad7Moderate.severity === 'moderate',
      detail: `phq9=${phq9Moderate.totalScore}/${phq9Moderate.severity};gad7=${gad7Moderate.totalScore}/${gad7Moderate.severity}`,
    },
    {
      id: 'p7_crisis_route_is_rule_based',
      ok:
        crisisRoute.eventType === 'crisis_route_triggered' &&
        crisisRoute.action === 'route_988' &&
        crisisRoute.navigatorPriority === 'urgent' &&
        crisisRoute.continueInstrument === false,
      detail: `${crisisRoute.eventType};priority=${crisisRoute.navigatorPriority};action=${crisisRoute.action}`,
    },
    {
      id: 'p7_sdoh_flags_are_assistive_only',
      ok:
        passiveSdoh.zCode === 'Z59.82' &&
        passiveSdoh.confidence === 'needs_review' &&
        !passiveSdoh.canAutoRefer &&
        !canSdohFlagChangeCarePriority(passiveSdoh) &&
        interpersonalSafety.navigatorPriority === 'soon' &&
        !isOutboundCategoryAllowed('interpersonal_safety', 'sms'),
      detail: `passive=${passiveSdoh.confidence};autoRefer=${passiveSdoh.canAutoRefer};safetySms=${isOutboundCategoryAllowed('interpersonal_safety', 'sms')}`,
    },
    {
      id: 'p7_campaign_reuses_barrier_task_shape',
      ok:
        campaign.eligiblePatientIds.join(',') === 'pat_1' &&
        campaignTask.reason === 'transportation_barrier' &&
        campaignTask.priority === 'routine' &&
        campaignTask.status === 'open',
      detail: `eligible=${campaign.eligiblePatientIds.join(',')};task=${campaignTask.reason}/${campaignTask.priority}`,
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
