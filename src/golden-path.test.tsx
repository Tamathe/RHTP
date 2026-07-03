import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from './data/seed'
import { useStore } from './store/useStore'

const s = () => useStore.getState()
const heroGap = () => s().gaps.find((gap) => gap.patientId === HERO_ID)!

beforeEach(() => s().reset())

describe('golden path: Overdue to Closed Loop', () => {
  it('drives the hero from overdue to closed with the expected counter ticks', () => {
    expect(heroGap().status).toBe('overdue')
    s().askQuestion(HERO_ID, 'Why me?', 'today')
    expect(heroGap().priorityLabel).toBe('app_engaged')
    s().reportBarrier(HERO_ID, 'transportation', 'No weekday ride')
    expect(heroGap().priorityLabel).toBe('navigator_needed')
    expect(s().navigatorTasks).toHaveLength(1)
    s().scheduleScreening(HERO_ID, 'site_fqhc_mobile', 'Saturday 9:00 AM')
    expect(s().metrics.find((metric) => metric.id === 'scheduled')!.value).toBe(6)
    s().enterResult(HERO_ID, 'normal')
    expect(heroGap().status).toBe('closed')
    expect(s().metrics.find((metric) => metric.id === 'completed')!.value).toBe(7)
    expect(s().metrics.find((metric) => metric.id === 'gaps_closed')!.value).toBe(5)
  })
})
