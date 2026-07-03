import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../data/seed'
import { useStore } from '../store/useStore'
import { ProgramOutcomesView } from './hub/ProgramOutcomesView'

beforeEach(() => useStore.getState().reset())

describe('ProgramOutcomesView', () => {
  it('shows the baseline scheduled counter of 5', () => {
    render(<ProgramOutcomesView />)
    const card = screen.getByText('Screenings scheduled').parentElement!
    expect(card).toHaveTextContent('5')
  })

  it('reflects the +1 tick after the hero schedules', () => {
    useStore.getState().scheduleScreening(HERO_ID, 'site_fqhc_mobile', 'Saturday 9:00 AM')
    render(<ProgramOutcomesView />)
    const card = screen.getByText('Screenings scheduled').parentElement!
    expect(card).toHaveTextContent('6')
  })
})
