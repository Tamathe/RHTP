import { describe, expect, it } from 'vitest'
import type { HubMetric } from '../types'
import { incrementMetric } from './metrics'

const m = (id: string, value: number): HubMetric => ({
  id,
  label: id,
  seed: value,
  value,
  denominator: 13,
  scope: 'cohort',
})

describe('incrementMetric', () => {
  it('bumps only the matching metric by 1', () => {
    const out = incrementMetric([m('scheduled', 5), m('completed', 6)], 'scheduled')
    expect(out.find((x) => x.id === 'scheduled')!.value).toBe(6)
    expect(out.find((x) => x.id === 'completed')!.value).toBe(6)
  })

  it('returns a new array and does not mutate input', () => {
    const input = [m('scheduled', 5)]
    const out = incrementMetric(input, 'scheduled')
    expect(out).not.toBe(input)
    expect(input[0].value).toBe(5)
  })
})
