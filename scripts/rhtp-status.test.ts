import { describe, expect, it } from 'vitest'

import { renderStatus } from './rhtp-status'
import type { PreviewDeploymentReceipt } from '../server/deploy-receipt'

describe('rhtp status output', () => {
  it('separates stakeholder demo blockers from production-only health-information gates by phase', () => {
    const output = renderStatus()

    expect(output).toContain(
      'P4 Retinopathy pilot: demo_ready_real_phi_blocked | demo blockers: none | production-only gates: E2, H2, H3, H5',
    )
    expect(output).toContain(
      'P7 Screenings and campaigns: local_screening_campaign_gate_verified_demo_ready_real_phi_blocked | demo blockers: none | production-only gates: H4',
    )
  })

  it('prints prototype-deferred health-information gates separately from demo blockers', () => {
    const output = renderStatus(['--blockers'])

    expect(output).toContain('Prototype-deferred health-information gates (not demo blockers)')
    expect(output).toContain('Open demo blockers')
    expect(output).toContain('No open demo blockers.')
  })

  it('prints the stakeholder prototype scope and deferred health-info gates', () => {
    const output = renderStatus(['--blockers'])

    expect(output).toContain('Prototype scope')
    expect(output).toContain('Patient data: false')
    expect(output).toContain('Health-info gates deferred outside stakeholder prototype: E2, H2, H3, H4, H5')
  })

  it('prints a concise deploy ladder with public receipt state', () => {
    const output = renderStatus(['--deploy'], { previewReceiptExists: false })

    expect(output).toContain('RHTP deploy status')
    expect(output).toContain('Current proof rung: local_release_gate_verified_no_real_phi')
    expect(output).toContain('Local no-PHI release gate: verified | no-PHI | command: npm run release:gate')
    expect(output).toContain('Stakeholder release packet: available | no-PHI | command: npm run release:packet')
    expect(output).toContain('Static Vite preview: local_static_preview_verified_ready_for_deploy_attempt | no-PHI | command: npm run release:gate && npm run preview:verify')
    expect(output).toContain('Public preview receipt: missing')
    expect(output).toContain(
      'Real-PHI pilot infrastructure: not_in_prototype | real-PHI | command: not part of stakeholder prototype',
    )
    expect(output).toContain('npm run release:gate')
    expect(output).toContain('npm run release:packet')
    expect(output).toContain('npm run preview:verify')
  })

  it('prints the latest public preview receipt details when one is available', () => {
    const previewReceipt: PreviewDeploymentReceipt = {
      cases: [],
      commit: 'abc123',
      deploymentId: 'dpl_123',
      phi: false,
      proof: ['npm run preview:verify'],
      target: 'vercel_static_preview',
      url: 'https://rhtp-demo.vercel.app/',
      verifiedAt: '2026-07-04T21:00:00.000Z',
    }
    const output = renderStatus(['--deploy'], { previewReceipt })

    expect(output).toContain(
      'Public preview receipt: recorded: https://rhtp-demo.vercel.app/ | deployment=dpl_123 | commit=abc123 | verified=2026-07-04T21:00:00.000Z',
    )
  })

  it('prints Appendix B residuals as production-only tracking, not demo blockers', () => {
    const output = renderStatus(['--residuals'])

    expect(output).toContain('Appendix B residuals')
    expect(output).toContain(
      'Appendix B.4 B4_ACCESSIBILITY_WCAG: tracked_production_backlog | production | demo blocker=false',
    )
    expect(output).toContain(
      'Appendix B.6 B6_RIGHT_TO_ERASURE_APPEND_ONLY_LOG: tracked_production_backlog | real_phi | demo blocker=false',
    )
  })
})
