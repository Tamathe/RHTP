import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../../store/useStore'
import { HubShell } from './HubShell'

beforeEach(() => useStore.getState().reset())

describe('HubShell', () => {
  it('opens on the navigator queue view', () => {
    render(<HubShell />)

    expect(screen.getAllByRole('button')[0]).toHaveTextContent(/Navigator queue/i)
    expect(screen.getByText(/No open navigator work/i)).toBeInTheDocument()
  })

  it('opens the billing evidence view from hub navigation', () => {
    render(<HubShell />)

    fireEvent.click(screen.getByRole('button', { name: /Billing evidence/i }))

    expect(screen.getByRole('heading', { name: /billing evidence/i })).toBeInTheDocument()
    expect(screen.getByText(/Claim submission remains blocked/i)).toBeInTheDocument()
  })

  it('opens the navigator enrollment view from hub navigation', () => {
    render(<HubShell />)

    fireEvent.click(screen.getByRole('button', { name: /Enrollment/i }))

    expect(screen.getByRole('heading', { name: /In-person enrollment/i })).toBeInTheDocument()
    expect(screen.getByText(/Trust transfer ready/i)).toBeInTheDocument()
  })
})
