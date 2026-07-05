import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../store/useStore'
import { BillingEvidenceView } from './hub/BillingEvidenceView'

beforeEach(() => useStore.getState().reset())

describe('BillingEvidenceView', () => {
  it('shows synthetic billing evidence without claiming claim submission readiness', () => {
    render(<BillingEvidenceView />)

    expect(screen.getByRole('heading', { name: /billing evidence/i })).toBeInTheDocument()
    expect(screen.getByText(/69 minutes/i)).toBeInTheDocument()
    expect(screen.getAllByText(/18 reading days/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/CCM monthly care management time/i)).toBeInTheDocument()
    expect(screen.getByText(/RPM reading-day evidence/i)).toBeInTheDocument()
    expect(screen.getByText(/Claim submission remains blocked/i)).toBeInTheDocument()
  })
})
