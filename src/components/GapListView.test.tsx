import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../data/seed'
import { useStore } from '../store/useStore'
import { GapListView } from './hub/GapListView'

beforeEach(() => useStore.getState().reset())

describe('GapListView', () => {
  it('renders a row for the hero patient with an Overdue chip', () => {
    render(<GapListView />)
    expect(screen.getByText('Ruth Ann Caldwell')).toBeInTheDocument()
    expect(screen.getAllByText(/overdue/i).length).toBeGreaterThan(0)
  })

  it('reflects a live status change after a barrier is reported', () => {
    useStore.getState().reportBarrier(HERO_ID, 'transportation', 'no ride')
    render(<GapListView />)
    expect(screen.getByText(/navigator needed/i)).toBeInTheDocument()
  })
})
