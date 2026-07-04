import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../data/seed'
import { useStore } from '../store/useStore'
import { PlanBuilderScreen } from './phone/PlanBuilderScreen'

const heroGap = () => useStore.getState().gaps.find((gap) => gap.patientId === HERO_ID)!

beforeEach(() => useStore.getState().reset())

describe('PlanBuilderScreen', () => {
  it('reporting a ride barrier creates a navigator task and flags navigator_needed', async () => {
    render(<PlanBuilderScreen onDone={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /need a ride/i }))
    expect(useStore.getState().navigatorTasks).toHaveLength(1)
    expect(heroGap().priorityLabel).toBe('navigator_needed')
  })

  it('confirming a time schedules the screening', async () => {
    render(<PlanBuilderScreen onDone={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /confirm saturday/i }))
    expect(heroGap().status).toBe('scheduled')
  })

  it('already completed sends reconciliation work to the navigator queue', async () => {
    render(<PlanBuilderScreen onDone={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /already completed/i }))
    expect(screen.getByText(/will confirm this screening/i)).toBeInTheDocument()
    expect(screen.queryByText(/marked this screening complete/i)).not.toBeInTheDocument()
    expect(heroGap().status).toBe('overdue')
    expect(useStore.getState().navigatorQueue).toEqual([
      expect.objectContaining({
        patientId: HERO_ID,
        reason: 'already_completed_needs_reconciliation',
        status: 'open',
      }),
    ])
  })

  it('includes Kentucky SDOH resource matching on the plan screen', async () => {
    render(<PlanBuilderScreen onDone={() => {}} />)

    expect(screen.getByText(/Kentucky resource matches/i)).toBeInTheDocument()
    expect(screen.getByText(/LKLP Community Action Council transportation/i)).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', {
        name: /Ask navigator to connect with LKLP Community Action Council transportation/i,
      }),
    )

    expect(useStore.getState().navigatorQueue).toEqual([
      expect.objectContaining({
        reason: 'sdoh_resource_connection',
        status: 'open',
      }),
    ])
  })
})
