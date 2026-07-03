import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../../data/seed'
import { useStore } from '../../store/useStore'
import { ProvenanceStrip } from './ProvenanceStrip'

beforeEach(() => useStore.getState().reset())

describe('ProvenanceStrip', () => {
  it('shows source, date, and confidence for patient-facing claims', () => {
    render(<ProvenanceStrip patientId={HERO_ID} labels={['Diabetes diagnosis', 'Retinal screening gap']} />)

    expect(screen.getByText(/Kentucky HIE pilot feed/i)).toBeInTheDocument()
    expect(screen.getByText(/Claims gap file/i)).toBeInTheDocument()
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument()
    expect(screen.getByText(/probable/i)).toBeInTheDocument()
  })
})
