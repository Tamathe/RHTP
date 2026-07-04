import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../../store/useStore'
import { VoiceCompanionScreen } from './VoiceCompanionScreen'

beforeEach(() => useStore.getState().reset())

describe('VoiceCompanionScreen', () => {
  it('starts Sandy voice outreach and shows the transcript', async () => {
    render(<VoiceCompanionScreen />)

    await userEvent.click(screen.getByRole('button', { name: /start voice outreach/i }))

    expect(screen.getByText(/I am Sandy/i)).toBeInTheDocument()
    expect(useStore.getState().protocolEvents.some((event) => event.type === 'sandy_explained_gap')).toBe(true)
  })

  it('lets the patient report a ride barrier by voice chip', async () => {
    render(<VoiceCompanionScreen />)

    await userEvent.click(screen.getByRole('button', { name: /start voice outreach/i }))
    await userEvent.click(screen.getByRole('button', { name: /I need a ride/i }))

    expect(screen.getAllByText(/I need a ride/i).length).toBeGreaterThanOrEqual(2)
    expect(useStore.getState().navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({ reason: 'transportation_barrier' }),
    )
  })

  it('shows red-flag escalation copy when the patient reports sudden vision changes', async () => {
    render(<VoiceCompanionScreen />)

    await userEvent.click(screen.getByRole('button', { name: /start voice outreach/i }))
    await userEvent.click(screen.getByRole('button', { name: /sudden vision changes/i }))

    expect(screen.getAllByText(/could be urgent/i).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('button', { name: /start voice outreach/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Why do I need this/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /I need a ride/i })).toBeDisabled()
    expect(useStore.getState().navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({ reason: 'red_flag_symptom', priority: 'urgent' }),
    )
  })

  it('keeps live voice hidden unless the client gate is enabled', () => {
    render(<VoiceCompanionScreen />)

    expect(screen.queryByRole('button', { name: /connect live voice/i })).not.toBeInTheDocument()
  })

  it('connects live voice through the gated browser connector', async () => {
    render(
      <VoiceCompanionScreen
        realtimeVoiceEnabled
        realtimeVoiceStarter={async () => ({
          status: 'connected',
          stop: () => undefined,
        })}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /connect live voice/i }))

    expect(screen.getByText(/live voice connected/i)).toBeInTheDocument()
  })
})
