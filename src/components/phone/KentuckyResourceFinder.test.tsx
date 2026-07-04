import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../../data/seed'
import { useStore } from '../../store/useStore'
import { KentuckyResourceFinder } from './KentuckyResourceFinder'

beforeEach(() => useStore.getState().reset())

describe('KentuckyResourceFinder', () => {
  it('shows county-specific Kentucky resource matches with source provenance', () => {
    render(<KentuckyResourceFinder patientId={HERO_ID} county="Perry" />)

    expect(screen.getByText(/Kentucky resource matches/i)).toBeInTheDocument()
    expect(screen.getByText(/^Perry County$/i)).toBeInTheDocument()
    expect(screen.getByText(/LKLP Community Action Council transportation/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Kentucky Transportation Cabinet Human Services Transportation/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/availability and eligibility must be confirmed/i)).toBeInTheDocument()
  })

  it('switches needs and routes connection requests to the navigator', async () => {
    render(<KentuckyResourceFinder patientId={HERO_ID} county="Perry" />)

    await userEvent.click(screen.getByRole('button', { name: 'Food' }))

    expect(screen.getByText(/Perry County food resources/i)).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', {
        name: /Ask navigator to connect with Perry County food resources/i,
      }),
    )

    expect(screen.getByText(/Sent to your navigator/i)).toBeInTheDocument()
    expect(useStore.getState().navigatorQueue).toEqual([
      expect.objectContaining({
        reason: 'sdoh_resource_connection',
        summary: expect.stringContaining('Perry County food resources'),
      }),
    ])
  })
})
