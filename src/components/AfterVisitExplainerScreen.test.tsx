import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useStore } from '../store/useStore'
import { AfterVisitExplainerScreen } from './phone/AfterVisitExplainerScreen'

beforeEach(() => useStore.getState().reset())

describe('AfterVisitExplainerScreen', () => {
  it('shows a cited no-PHI discharge explainer with safety boundaries', () => {
    render(<AfterVisitExplainerScreen />)

    expect(screen.getByRole('heading', { name: /After-visit explainer/i })).toBeInTheDocument()
    expect(screen.getByText(/plain-language summary/i)).toBeInTheDocument()
    expect(screen.getByText(/Source: KHIE discharge demo DocumentReference/i)).toBeInTheDocument()
    expect(screen.getByText(/What happened/i)).toBeInTheDocument()
    expect(screen.getByText(/What to do next/i)).toBeInTheDocument()
    expect(screen.getByText(/Questions to ask/i)).toBeInTheDocument()
    expect(screen.getByText(/No real HIE document retrieved/i)).toBeInTheDocument()
    expect(screen.getByText(/does not replace your discharge instructions/i)).toBeInTheDocument()
  })
})
