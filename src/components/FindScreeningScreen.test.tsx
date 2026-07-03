import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../store/useStore'
import { FindScreeningScreen } from './phone/FindScreeningScreen'

beforeEach(() => useStore.getState().reset())

describe('FindScreeningScreen', () => {
  it('shows the best-match explanation with distance and ride support', () => {
    render(<FindScreeningScreen onSelect={() => {}} />)
    const explanation = screen.getByText(/Best match because/i)
    expect(explanation).toBeInTheDocument()
    expect(explanation).toHaveTextContent(/8 miles/i)
    expect(explanation).toHaveTextContent(/ride support/i)
  })

  it('lists all seeded sites', () => {
    render(<FindScreeningScreen onSelect={() => {}} />)
    expect(screen.getByText(/Perry County FQHC Mobile Camera/i)).toBeInTheDocument()
    expect(screen.getByText(/Regional Eye Clinic/i)).toBeInTheDocument()
  })
})
