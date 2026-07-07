import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../data/seed'
import { useStore } from '../store/useStore'
import { ResultScreen } from './phone/ResultScreen'

beforeEach(() => useStore.getState().reset())

describe('ResultScreen', () => {
  it('never fakes a clean result before a screening happens', () => {
    render(<ResultScreen />)
    expect(screen.getByText(/no screening yet/i)).toBeInTheDocument()
    expect(screen.getByText(/have not completed an eye screening/i)).toBeInTheDocument()
    expect(screen.queryByText(/no referral is needed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/looks good/i)).not.toBeInTheDocument()
  })

  it('shows an honest "requested" state after scheduling, not a result', () => {
    useStore.getState().scheduleScreening(HERO_ID, 'site_fqhc_mobile', 'Saturday 9:00 AM')
    render(<ResultScreen />)
    expect(screen.getByText(/screening requested/i)).toBeInTheDocument()
    expect(screen.getByText(/have not been taken yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/looks good/i)).not.toBeInTheDocument()
  })

  it('shows the calm normal-result copy only once the screening is completed', () => {
    const store = useStore.getState()
    store.scheduleScreening(HERO_ID, 'site_fqhc_mobile', 'Saturday 9:00 AM')
    store.enterResult(HERO_ID, 'normal')
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
