import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SafetyBoundaryCard } from './SafetyBoundaryCard'

describe('SafetyBoundaryCard', () => {
  it('states what Sandy can do and when a human is needed', () => {
    render(<SafetyBoundaryCard />)

    expect(screen.getByText(/Sandy can help with screening steps/i)).toBeInTheDocument()
    expect(screen.getByText(/cannot diagnose/i)).toBeInTheDocument()
    expect(screen.getByText(/sudden vision changes/i)).toBeInTheDocument()
  })
})
