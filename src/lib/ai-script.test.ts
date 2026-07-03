import { describe, expect, it } from 'vitest'
import {
  FALLBACK,
  PATIENT_CHIPS,
  WHY_CHIPS,
  WHY_IT_MATTERS_ANSWER,
  resolveAnswer,
} from './ai-script'

describe('resolveAnswer', () => {
  it('returns a scripted answer for a known chip', () => {
    const answer = resolveAnswer('Why me?')
    expect(answer).toBe(PATIENT_CHIPS.find((chip) => chip.chip === 'Why me?')!.answer)
    expect(answer).not.toBe(FALLBACK)
  })

  it('is case-insensitive and trims whitespace', () => {
    expect(resolveAnswer('  why me?  ')).toBe(resolveAnswer('Why me?'))
  })

  it('returns the exact fallback for anything off-script', () => {
    expect(resolveAnswer('will the government see my records?')).toBe(FALLBACK)
  })

  it('resolves the Why It Matters chip to its scripted answer', () => {
    expect(resolveAnswer('Why does this matter for me?', WHY_CHIPS)).toBe(WHY_IT_MATTERS_ANSWER)
  })

  it('exposes exactly the four Today chips', () => {
    expect(PATIENT_CHIPS.map((chip) => chip.chip)).toEqual([
      'Why me?',
      'Can I wait?',
      'What is the test like?',
      'Will this cost money?',
    ])
  })
})
