import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../data/seed'
import { useStore } from '../store/useStore'
import { PatientTimelineView } from './hub/PatientTimelineView'

beforeEach(() => useStore.getState().reset())

describe('PatientTimelineView', () => {
  it('shows the seeded gap-identified entry', () => {
    render(<PatientTimelineView />)
    expect(screen.getByText(/gap identified/i)).toBeInTheDocument()
  })

  it('adds a live entry after a barrier is reported', () => {
    useStore.getState().reportBarrier(HERO_ID, 'transportation', 'no ride')
    render(<PatientTimelineView />)
    expect(screen.getByText(/navigator task created/i)).toBeInTheDocument()
  })
})
