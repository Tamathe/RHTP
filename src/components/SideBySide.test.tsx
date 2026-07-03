import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../store/useStore'
import { SideBySide } from './SideBySide'

beforeEach(() => useStore.getState().reset())

describe('SideBySide integration', () => {
  it('a voice-reported barrier appears in the navigator queue', async () => {
    render(<SideBySide />)

    await userEvent.click(screen.getByRole('button', { name: /start voice outreach/i }))
    await userEvent.click(screen.getByRole('button', { name: /I need a ride/i }))

    expect(screen.getByText(/Transportation barrier/i)).toBeInTheDocument()
    expect(screen.getByText(/Help resolve the barrier/i)).toBeInTheDocument()
  })

  it('a voice red flag appears as urgent navigator work', async () => {
    render(<SideBySide />)

    await userEvent.click(screen.getByRole('button', { name: /start voice outreach/i }))
    await userEvent.click(screen.getByRole('button', { name: /sudden vision changes/i }))

    expect(screen.getByText(/red flag symptom/i)).toBeInTheDocument()
    expect(useStore.getState().navigatorQueue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: 'red_flag_symptom',
          priority: 'urgent',
        }),
      ]),
    )
  })

  it('Reset demo returns the hero gap to overdue', async () => {
    render(<SideBySide />)
    await userEvent.click(screen.getByRole('button', { name: 'Plan' }))
    await userEvent.click(screen.getByRole('button', { name: /already completed/i }))
    await userEvent.click(screen.getByRole('button', { name: /reset demo/i }))
    expect(screen.getAllByText(/overdue/i).length).toBeGreaterThan(0)
  })
})
