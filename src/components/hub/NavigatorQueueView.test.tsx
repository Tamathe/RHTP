import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../../data/seed'
import { useStore } from '../../store/useStore'
import { NavigatorQueueView } from './NavigatorQueueView'

beforeEach(() => useStore.getState().reset())

describe('NavigatorQueueView', () => {
  it('renders actionable queue items with source context and suggested action', () => {
    useStore.getState().startAutonomousOutreach(HERO_ID)
    useStore.getState().recordPatientVoiceReply(HERO_ID, 'I need a ride')

    render(<NavigatorQueueView />)

    expect(screen.getByText(/Ruth Ann Caldwell/i)).toBeInTheDocument()
    expect(screen.getByText(/transportation barrier/i)).toBeInTheDocument()
    expect(screen.getByText(/Help resolve the barrier/i)).toBeInTheDocument()
    expect(screen.getByText(/source facts/i)).toBeInTheDocument()
  })

  it('shows an empty queue state when no human work is needed', () => {
    render(<NavigatorQueueView />)

    expect(screen.getByText(/No open navigator work/i)).toBeInTheDocument()
  })
})
