import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../../data/seed'
import { useStore } from '../../store/useStore'
import { NavigatorQueueView } from './NavigatorQueueView'

beforeEach(() => useStore.getState().reset())

describe('NavigatorQueueView', () => {
  it('renders actionable queue items with protocol context, source facts, and anchored actions', () => {
    useStore.getState().startAutonomousOutreach(HERO_ID)
    useStore.getState().recordPatientVoiceReply(HERO_ID, 'I need a ride')

    render(<NavigatorQueueView />)

    expect(screen.getByText(/Ruth Ann Caldwell/i)).toBeInTheDocument()
    expect(screen.getByText(/transportation barrier/i)).toBeInTheDocument()
    expect(screen.getByText(/Protocol trail/i)).toBeInTheDocument()
    expect(screen.getByText(/Barrier reported by voice/i)).toBeInTheDocument()
    expect(screen.getByText(/Type: barrier reported/i)).toBeInTheDocument()
    expect(screen.getByText(/Status: barrier collected/i)).toBeInTheDocument()
    expect(screen.getByText(/Actor: patient/i)).toBeInTheDocument()
    expect(screen.getByText(/Derived from the protocol\/source trail above/i)).toBeInTheDocument()
    expect(screen.getByText(/Patient said: I need a ride/i)).toBeInTheDocument()
    expect(screen.getByText(/Help resolve the barrier and confirm the screening plan\./i)).toBeInTheDocument()
    expect(screen.getByText(/Source facts/i)).toBeInTheDocument()
    expect(screen.getByText(/Diabetes diagnosis/i)).toBeInTheDocument()
  })

  it('shows an empty queue state when no human work is needed', () => {
    render(<NavigatorQueueView />)

    expect(screen.getByText(/No open navigator work/i)).toBeInTheDocument()
  })

  it('labels SDOH resource connection work for the navigator', () => {
    useStore
      .getState()
      .requestSdohResourceHelp(HERO_ID, 'lklp_transportation_region_13', 'transportation')

    render(<NavigatorQueueView />)

    expect(screen.getAllByText(/SDOH resource connection/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/LKLP Community Action Council transportation/i)).toBeInTheDocument()
    expect(screen.getByText(/confirm availability/i)).toBeInTheDocument()
  })
})
