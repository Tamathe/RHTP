import { describe, expect, it } from 'vitest'

import { renderStatus } from './rhtp-status'

describe('rhtp status output', () => {
  it('separates stakeholder demo blockers from real-PHI blockers by phase', () => {
    const output = renderStatus()

    expect(output).toContain(
      'P4 Retinopathy pilot: demo_ready_real_phi_blocked | demo blockers: none | real-PHI blockers: E2, H2, H3, H5',
    )
    expect(output).toContain(
      'P7 Screenings and campaigns: demo_ready_real_phi_blocked | demo blockers: none | real-PHI blockers: H4',
    )
  })

  it('prints real-PHI blockers separately from demo blockers', () => {
    const output = renderStatus(['--blockers'])

    expect(output).toContain('Open real-PHI blockers')
    expect(output).toContain('Open demo blockers')
    expect(output).toContain('No open demo blockers.')
  })
})
