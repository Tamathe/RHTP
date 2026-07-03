import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './store/useStore'
import { SideBySide } from './components/SideBySide'

beforeEach(() => useStore.getState().reset())

describe('RHTP P0 production-shaped golden path', () => {
  it('moves from voice outreach to navigator queue to scheduled plan and outcome metrics', async () => {
    render(<SideBySide />)

    await userEvent.click(screen.getByRole('button', { name: /start voice outreach/i }))
    await userEvent.click(screen.getByRole('button', { name: /I need a ride/i }))

    expect(screen.getByText(/transportation barrier/i)).toBeInTheDocument()
    expect(useStore.getState().navigatorQueue.at(-1)?.reason).toBe('transportation_barrier')

    await userEvent.click(screen.getByRole('button', { name: 'Find' }))
    await userEvent.click(screen.getByRole('button', { name: /FQHC mobile camera/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))

    expect(useStore.getState().gaps.find((gap) => gap.patientId === 'pat_ruthann')?.status).toBe('scheduled')
    expect(useStore.getState().metrics.find((metric) => metric.id === 'scheduled')?.value).toBe(6)
  })
})
