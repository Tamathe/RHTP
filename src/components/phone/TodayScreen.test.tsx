import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HERO_ID } from '../../data/seed'
import { useStore } from '../../store/useStore'
import { TodayScreen } from './TodayScreen'

beforeEach(() => useStore.getState().reset())

describe('TodayScreen', () => {
  it('shows provenance and safety boundaries beside the next action', () => {
    render(<TodayScreen onNext={vi.fn()} />)

    expect(screen.getByText(/Why Sandy can say this/i)).toBeInTheDocument()
    expect(screen.getByText(/Kentucky HIE pilot feed/i)).toBeInTheDocument()
    expect(screen.getByText(/Claims gap file/i)).toBeInTheDocument()
    expect(screen.getByText(/What Sandy can safely do/i)).toBeInTheDocument()
    expect(screen.getByText(/cannot diagnose/i)).toBeInTheDocument()
    expect(useStore.getState().sourceFacts.some((fact) => fact.patientId === HERO_ID)).toBe(true)
  })
})
