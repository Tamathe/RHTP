import { describe, expect, it } from 'vitest'
import {
  EDUCATION_CHIPS,
  RETINOPATHY_TOPICS,
  answerEducationQuestion,
  isAcuteVisionConcern,
} from './retinopathy-education'

describe('retinopathy education content', () => {
  it('covers the core curriculum topics', () => {
    const ids = RETINOPATHY_TOPICS.map((topic) => topic.id)
    for (const required of ['what', 'silent', 'exam', 'results', 'treatment', 'protect']) {
      expect(ids).toContain(required)
    }
    for (const topic of RETINOPATHY_TOPICS) {
      expect(topic.body.length).toBeGreaterThan(80)
    }
  })

  it('answers every suggested chip with a grounded, sourced answer', () => {
    for (const chip of EDUCATION_CHIPS) {
      const result = answerEducationQuestion(chip)
      expect(result.kind).toBe('answer')
      if (result.kind === 'answer') {
        expect(result.text.length).toBeGreaterThan(40)
        expect(result.source).toMatch(/not a diagnosis/i)
      }
    }
  })

  it('maps common phrasings to the right topic', () => {
    expect(answerEducationQuestion('what is diabetic retinopathy?')).toMatchObject({
      text: expect.stringMatching(/eye damage from diabetes/i),
    })
    expect(answerEducationQuestion('does it hurt')).toMatchObject({
      text: expect.stringMatching(/quick and painless/i),
    })
    expect(answerEducationQuestion('how often should I get screened')).toMatchObject({
      text: expect.stringMatching(/about once a year/i),
    })
    expect(answerEducationQuestion('will I go blind')).toMatchObject({
      text: expect.stringMatching(/most serious loss can be avoided/i),
    })
  })

  it('falls back safely for an unrelated question', () => {
    const result = answerEducationQuestion('what is the weather today')
    expect(result.kind).toBe('fallback')
    expect(result.text).toMatch(/care team/i)
  })
})

describe('isAcuteVisionConcern (defense-in-depth guard)', () => {
  it('flags plain-language acute eye symptoms the crisis regex can miss', () => {
    for (const message of [
      "I'm suddenly losing my vision",
      'I am losing my sight',
      'there is a curtain over my eye',
      'I have a shadow over my vision',
      'lots of new floaters today',
      'I see flashes of light',
      "I can't see out of one eye",
      'my eye pain is getting worse',
      'everything went dark',
    ]) {
      expect(isAcuteVisionConcern(message)).toBe(true)
    }
  })

  it('does NOT flag general, non-urgent education questions', () => {
    for (const message of [
      'will I go blind?',
      'does diabetes cause blindness?',
      'how do I avoid vision loss?',
      'what is diabetic retinopathy?',
      'will it hurt?',
      'how often do I need it?',
    ]) {
      expect(isAcuteVisionConcern(message)).toBe(false)
    }
  })
})
