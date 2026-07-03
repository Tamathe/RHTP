import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../../store/useStore'
import { HubShell } from './HubShell'

beforeEach(() => useStore.getState().reset())

describe('HubShell', () => {
  it('opens on the navigator queue view', () => {
    render(<HubShell />)

    expect(screen.getByText(/Navigator queue/i)).toBeInTheDocument()
    expect(screen.getByText(/No open navigator work/i)).toBeInTheDocument()
  })
})
