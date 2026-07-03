import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../store/useStore'
import { SideBySide } from './SideBySide'

beforeEach(() => useStore.getState().reset())

describe('SideBySide integration', () => {
  it('a barrier reported on the phone appears in the hub protocol trail', async () => {
    render(<SideBySide />)
    await userEvent.click(screen.getByRole('button', { name: 'Plan' }))
    await userEvent.click(screen.getByRole('button', { name: /need a ride/i }))
    expect(screen.getByText(/Protocol trail/i)).toBeInTheDocument()
    expect(screen.getByText(/Derived from the protocol\/source trail above/i)).toBeInTheDocument()
  })

  it('Reset demo returns the hero gap to overdue', async () => {
    render(<SideBySide />)
    await userEvent.click(screen.getByRole('button', { name: 'Plan' }))
    await userEvent.click(screen.getByRole('button', { name: /already completed/i }))
    await userEvent.click(screen.getByRole('button', { name: /reset demo/i }))
    expect(screen.getAllByText(/overdue/i).length).toBeGreaterThan(0)
  })
})
