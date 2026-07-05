import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useStore } from '../../store/useStore'
import { NavigatorEnrollmentView } from './NavigatorEnrollmentView'

beforeEach(() => useStore.getState().reset())

describe('NavigatorEnrollmentView', () => {
  it('shows in-person navigator attestation and trust transfer boundaries', () => {
    render(<NavigatorEnrollmentView />)

    expect(screen.getByRole('heading', { name: /In-person enrollment/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Navigator-attested/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Offline-capable intake/i)).toBeInTheDocument()
    expect(screen.getByText(/proofed_in_person/i)).toBeInTheDocument()
    expect(screen.getByText(/Trust transfer ready/i)).toBeInTheDocument()
    expect(screen.getByText(/No real identity proofing or account creation/i)).toBeInTheDocument()
  })
})
