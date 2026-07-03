import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../data/seed'
import { useStore } from '../store/useStore'
import { ResultScreen } from './phone/ResultScreen'

beforeEach(() => useStore.getState().reset())

describe('ResultScreen', () => {
  it('shows the calm normal-result copy by default', () => {
    render(<ResultScreen />)
    expect(screen.getByText(/no referral is needed/i)).toBeInTheDocument()
    expect(screen.getByText(/remind you next year/i)).toBeInTheDocument()
  })

  it('shows referral copy when the gap is in referral', () => {
    const store = useStore.getState()
    store.scheduleScreening(HERO_ID, 'site_fqhc_mobile', 'Saturday 9:00 AM')
    store.enterResult(HERO_ID, 'abnormal')
    render(<ResultScreen />)
    expect(screen.getByText(/follow-up with an eye specialist/i)).toBeInTheDocument()
  })
})
