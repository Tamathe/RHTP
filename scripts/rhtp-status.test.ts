import { describe, expect, it } from 'vitest'

import { renderStatus } from './rhtp-status'

describe('rhtp status output', () => {
  it('separates stakeholder demo blockers from real-PHI blockers by phase', () => {
    const output = renderStatus()

    expect(output).toContain(
      'P4 Retinopathy pilot: demo_ready_real_phi_blocked | demo blockers: none | real-PHI blockers: E2, H2, H3, H5',
    )
    expect(output).toContain(
      'P7 Screenings and campaigns: local_screening_campaign_gate_verified_demo_ready_real_phi_blocked | demo blockers: none | real-PHI blockers: H4',
    )
  })

  it('prints real-PHI blockers separately from demo blockers', () => {
    const output = renderStatus(['--blockers'])

    expect(output).toContain('Parked real-PHI blockers (not demo blockers)')
    expect(output).toContain('Open demo blockers')
    expect(output).toContain('No open demo blockers.')
  })

  it('prints the stakeholder prototype scope and deferred health-info gates', () => {
    const output = renderStatus(['--blockers'])

    expect(output).toContain('Prototype scope')
    expect(output).toContain('Patient data: false')
    expect(output).toContain('Health-info gates deferred for stakeholder demo: E2, H2, H3, H4, H5')
  })

  it('prints a concise deploy ladder with public receipt state', () => {
    const output = renderStatus(['--deploy'], { previewReceiptExists: false })

    expect(output).toContain('RHTP deploy status')
    expect(output).toContain('Current proof rung: local_release_gate_verified_no_real_phi')
    expect(output).toContain('Local no-PHI release gate: verified | no-PHI | command: npm run release:gate')
    expect(output).toContain('Stakeholder release packet: available | no-PHI | command: npm run release:packet')
    expect(output).toContain('Static Vite preview: local_static_preview_verified_ready_for_deploy_attempt | no-PHI | command: npm run release:gate && npm run preview:verify')
    expect(output).toContain('Public preview receipt: missing')
    expect(output).toContain('Real-PHI pilot infrastructure: blocked | real-PHI | command: not allowed yet')
    expect(output).toContain('npm run release:gate')
    expect(output).toContain('npm run release:packet')
    expect(output).toContain('npm run preview:verify')
  })
})
