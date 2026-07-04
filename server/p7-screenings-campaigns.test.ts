import { describe, expect, it } from 'vitest'

import {
  canSdohFlagChangeCarePriority,
  createCampaignBarrierTask,
  evaluateCampaignCohort,
  isOutboundCategoryAllowed,
  raiseSdohFlag,
  routeScreeningResult,
  screeningItems,
  scoreGad7,
  scorePhq2,
  scorePhq9,
} from './p7-screenings-campaigns'

describe('P7 screenings and campaigns rail', () => {
  it('renders locked PHQ/GAD item text byte-identically', () => {
    expect(screeningItems.phq2.map((item) => item.text)).toEqual([
      'Little interest or pleasure in doing things',
      'Feeling down, depressed, or hopeless',
    ])
    expect(screeningItems.phq9[8]).toEqual({
      instrument: 'phq9',
      itemNo: 9,
      text: 'Thoughts that you would be better off dead, or of hurting yourself in some way',
      isCrisisItem: true,
    })
    expect(screeningItems.gad7[0]?.text).toBe('Feeling nervous, anxious, or on edge')
  })

  it('scores PHQ-2, PHQ-9, and GAD-7 deterministically', () => {
    expect(scorePhq2([1, 1])).toEqual({
      instrument: 'phq2',
      totalScore: 2,
      positive: false,
      nextInstrument: null,
    })
    expect(scorePhq2([2, 1])).toEqual({
      instrument: 'phq2',
      totalScore: 3,
      positive: true,
      nextInstrument: 'phq9',
    })
    expect(scorePhq9([2, 2, 2, 2, 2, 0, 0, 0, 0])).toEqual({
      instrument: 'phq9',
      totalScore: 10,
      severity: 'moderate',
      crisisItemPositive: false,
    })
    expect(scoreGad7([2, 2, 2, 2, 2, 0, 0])).toEqual({
      instrument: 'gad7',
      totalScore: 10,
      severity: 'moderate',
    })
  })

  it('routes PHQ crisis triggers immediately and ignores model advice for scoring', () => {
    const structured = routeScreeningResult({
      instrument: 'phq9',
      answers: [0, 0, 0, 0, 0, 0, 0, 0, 1],
      freeText: '',
      adversarialModelSeverity: 'none_minimal',
    })
    const freeText = routeScreeningResult({
      instrument: 'phq9',
      answers: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      freeText: 'I might hurt myself tonight',
      adversarialModelSeverity: 'none_minimal',
    })

    expect(structured).toEqual({
      eventType: 'crisis_route_triggered',
      state: 'navigator_review',
      navigatorReason: 'crisis_escalation',
      navigatorPriority: 'urgent',
      action: 'route_988',
      continueInstrument: false,
      totalScore: 1,
      severity: 'none_minimal',
    })
    expect(freeText.eventType).toBe('crisis_route_triggered')
    expect(freeText.navigatorPriority).toBe('urgent')
    expect(freeText.continueInstrument).toBe(false)
  })

  it('keeps SDOH flags assistive-only and source-grounded', () => {
    const passiveFlag = raiseSdohFlag({
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

    expect(passiveFlag).toEqual(
      expect.objectContaining({
        zCode: 'Z59.82',
        confidence: 'needs_review',
        canAutoRefer: false,
        navigatorPriority: 'routine',
      }),
    )
    expect(interpersonalSafety.navigatorPriority).toBe('soon')
    expect(canSdohFlagChangeCarePriority(passiveFlag)).toBe(false)
    expect(isOutboundCategoryAllowed('interpersonal_safety', 'sms')).toBe(false)
    expect(isOutboundCategoryAllowed('food', 'in_app')).toBe(true)
  })

  it('evaluates vaccination campaigns deterministically and reuses barrier task shape', () => {
    const cohort = evaluateCampaignCohort({
      packId: 'flu_campaign',
      patients: [
        { id: 'pat_1', age: 67, conditions: ['diabetes'], immunizations: [] },
        { id: 'pat_2', age: 31, conditions: [], immunizations: [] },
        { id: 'pat_3', age: 70, conditions: ['diabetes'], immunizations: ['flu_2026'] },
      ],
      season: '2026',
    })
    const task = createCampaignBarrierTask({
      patientId: 'pat_1',
      campaignId: cohort.id,
      barrier: 'transportation',
      sourceEventIds: ['event_campaign_enrolled'],
    })

    expect(cohort.eligiblePatientIds).toEqual(['pat_1'])
    expect(cohort.enrolledCount).toBe(1)
    expect(task).toEqual({
      id: 'nav_campaign_pat_1_flu_campaign_transportation',
      patientId: 'pat_1',
      reason: 'transportation_barrier',
      priority: 'routine',
      summary: 'Vaccination campaign barrier reported: transportation.',
      suggestedAction: 'Help resolve the barrier and confirm the campaign plan.',
      status: 'open',
      createdAt: '2026-07-04T09:00:00',
      sourceEventIds: ['event_campaign_enrolled'],
    })
  })
})
