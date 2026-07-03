import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../data/seed'
import { FALLBACK, PATIENT_CHIPS } from '../lib/ai-script'
import { useStore } from '../store/useStore'
import { AssistantBox } from './phone/AssistantBox'

beforeEach(() => useStore.getState().reset())

describe('AssistantBox', () => {
  it('shows the scripted answer when a chip is tapped', async () => {
    render(<AssistantBox patientId={HERO_ID} surface="today" chips={PATIENT_CHIPS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Why me?' }))
    expect(screen.getByText(PATIENT_CHIPS[0].answer)).toBeInTheDocument()
  })

  it('records engagement in the store on a chip tap', async () => {
    render(<AssistantBox patientId={HERO_ID} surface="today" chips={PATIENT_CHIPS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Can I wait?' }))
    expect(useStore.getState().gaps.find((gap) => gap.patientId === HERO_ID)!.priorityLabel).toBe(
      'app_engaged',
    )
  })

  it('shows the exact fallback for an off-script typed question', async () => {
    render(<AssistantBox patientId={HERO_ID} surface="today" chips={PATIENT_CHIPS} />)
    await userEvent.type(screen.getByRole('textbox'), 'will you sell my data?')
    await userEvent.click(screen.getByRole('button', { name: /ask/i }))
    expect(screen.getByText(FALLBACK)).toBeInTheDocument()
  })
})
