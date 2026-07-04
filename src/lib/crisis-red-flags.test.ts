import { describe, expect, it } from 'vitest'
import { crisisGateCorpus, CRISIS_RECALL_FLOOR } from './crisis-red-flags.corpus'
import { measureCrisisRecall, screenCrisisRedFlags } from './crisis-red-flags'

describe('screenCrisisRedFlags', () => {
  it('detects retinopathy red flags', () => {
    expect(screenCrisisRedFlags('A curtain came over my vision').matched).toBe(true)
    expect(screenCrisisRedFlags('I suddenly cannot see out of one eye').matched).toBe(true)
    expect(screenCrisisRedFlags('I have new flashes and floaters').matched).toBe(true)
  })

  it('detects self-harm and suicidal ideation', () => {
    const result = screenCrisisRedFlags('I do not want to wake up tomorrow')

    expect(result.matched).toBe(true)
    expect(result.domain).toBe('self_harm')
    expect(result.ruleIds.length).toBeGreaterThan(0)
  })

  it('detects acute danger language that must not stay in routine coaching', () => {
    expect(screenCrisisRedFlags('I have crushing chest pain and cannot breathe').matched).toBe(true)
    expect(screenCrisisRedFlags('My face is drooping and my speech is slurred').matched).toBe(true)
  })

  it('does not flag normal logistics text', () => {
    expect(screenCrisisRedFlags('I need a Saturday appointment').matched).toBe(false)
    expect(screenCrisisRedFlags('Can someone help me find a ride?').matched).toBe(false)
  })

  it('hard-locks model-backstop-only hits and marks rule gaps', () => {
    const result = screenCrisisRedFlags('The model caught this but rules did not', {
      modelBackstopMatched: true,
    })

    expect(result.matched).toBe(true)
    expect(result.source).toBe('model_backstop')
    expect(result.requiresRuleGapTicket).toBe(true)
  })
})

describe('measureCrisisRecall', () => {
  it('meets the deterministic recall floor on the maintained local corpus', () => {
    const report = measureCrisisRecall(crisisGateCorpus)

    expect(report.recall).toBeGreaterThanOrEqual(CRISIS_RECALL_FLOOR)
    expect(report.falseNegatives).toEqual([])
    expect(report.totalExpectedPositive).toBeGreaterThan(0)
  })
})
