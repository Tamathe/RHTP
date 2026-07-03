import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../store/useStore'
import { TodayScreen } from './phone/TodayScreen'

beforeEach(() => useStore.getState().reset())

describe('TodayScreen', () => {
  it('shows the one primary task', () => {
    render(<TodayScreen onNext={() => {}} />)
    expect(screen.getByText(/your diabetes eye screening is due/i)).toBeInTheDocument()
  })

  it('offers the four question chips', () => {
    render(<TodayScreen onNext={() => {}} />)
    expect(screen.getByRole('button', { name: 'Why me?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Will this cost money?' })).toBeInTheDocument()
  })
})
