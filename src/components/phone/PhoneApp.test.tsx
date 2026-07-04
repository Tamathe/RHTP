import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../../store/useStore'
import { PhoneApp } from './PhoneApp'

beforeEach(() => useStore.getState().reset())

describe('PhoneApp', () => {
  it('starts on voice but still lets the other tabs be reached', async () => {
    const user = userEvent.setup()

    render(<PhoneApp />)

    expect(screen.getByRole('button', { name: 'Voice' })).toHaveClass('bg-teal-700')
    expect(screen.getByText(/start with voice/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Health' }))
    expect(screen.getByText(/your health signals/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /blood pressure/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(screen.getByText(/your diabetes eye screening is due/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Why' }))
    expect(screen.getByText(/why it matters/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Find' }))
    expect(screen.getByText(/find screening/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Plan' }))
    expect(screen.getByText(/build your plan/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Result' }))
    expect(screen.getByText(/your result/i)).toBeInTheDocument()
  })
})
