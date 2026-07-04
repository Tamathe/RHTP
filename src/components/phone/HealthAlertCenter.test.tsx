import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { HealthAlertCenter } from './HealthAlertCenter'

describe('HealthAlertCenter', () => {
  it('renders routine health alerts with safety copy', () => {
    render(<HealthAlertCenter />)

    expect(screen.getByRole('heading', { name: 'Alerts' })).toBeInTheDocument()
    expect(screen.getByText('Take evening medication')).toBeInTheDocument()
    expect(screen.getByText('Check blood pressure')).toBeInTheDocument()
    expect(screen.getByText('Log symptoms')).toBeInTheDocument()
    expect(screen.getByText(/does not diagnose, change medication doses, or replace/i)).toBeInTheDocument()
  })

  it('marks a medication alert done and updates counts', async () => {
    const user = userEvent.setup()

    render(<HealthAlertCenter />)
    await user.click(screen.getByRole('button', { name: 'Mark Take evening medication done' }))

    expect(screen.getByText('1 due')).toBeInTheDocument()
    expect(screen.getByText('1 done')).toBeInTheDocument()
    expect(screen.getByText('Completed today')).toBeInTheDocument()
  })

  it('snoozes a blood pressure alert', async () => {
    const user = userEvent.setup()

    render(<HealthAlertCenter />)
    await user.click(screen.getByRole('button', { name: 'Snooze Check blood pressure' }))

    expect(screen.getByText('1 due')).toBeInTheDocument()
    expect(screen.getByText('2 upcoming')).toBeInTheDocument()
    expect(screen.getByText('Snoozed 30 minutes')).toBeInTheDocument()
  })
})
