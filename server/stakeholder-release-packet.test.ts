import { describe, expect, it } from 'vitest'

import releaseLedger from '../docs/ops/rhtp-release-ledger.json'
import packageJson from '../package.json'
import {
  createStakeholderReleasePacket,
  renderStakeholderReleasePacketMarkdown,
  type ReleaseLedger,
} from './stakeholder-release-packet'
import type { PreviewDeploymentReceipt } from './deploy-receipt'

const packetInput = {
  generatedAt: '2026-07-04T20:00:00.000Z',
  git: {
    aheadOfOrigin: 28,
    branch: 'master',
    commit: '0713897b84f0d2f130c87a29687f47fd3f15c8a4',
    dirty: false,
    shortCommit: '0713897',
  },
  ledger: releaseLedger as ReleaseLedger,
  publicPreviewReceiptExists: false,
}

describe('stakeholder release packet', () => {
  it('is exposed as an npm script', () => {
    expect(packageJson.scripts['release:packet']).toBe('tsx scripts/rhtp-stakeholder-release-packet.ts')
  })

  it('summarizes local proof, no-PHI scope, and undeployed public preview state', () => {
    const packet = createStakeholderReleasePacket(packetInput)

    expect(packet).toMatchObject({
      branch: 'master',
      proofRung: 'local_release_gate_verified_no_real_phi',
      localReleaseVerified: true,
      patientData: false,
      pushStatus: 'not_pushed',
      publicPreviewStatus: 'missing_receipt',
      realPhiPilotStatus: 'not_in_prototype',
    })
    expect(packet.parkedRealPhiBlockers).toEqual(['E2', 'H2', 'H3', 'H4', 'H5'])
    expect(packet.openDemoBlockers).toEqual([])
    expect(packet.requiredCommands).toEqual([
      'npm run release:gate',
      'git push origin master',
      'vercel link',
      'npm run preview:preflight',
      '$env:RHTP_PREVIEW_URL = "https://..."',
      '$env:RHTP_DEPLOYMENT_ID = "dpl_..."',
      '$env:RHTP_RECORD_PREVIEW_RECEIPT = "1"',
      'npm run preview:verify',
    ])
  })

  it('renders a copyable stakeholder handoff without claiming deployment', () => {
    const markdown = renderStakeholderReleasePacketMarkdown(createStakeholderReleasePacket(packetInput))

    expect(markdown).toContain('# RHTP Stakeholder Demo Release Packet')
    expect(markdown).toContain('- Proof rung: `local_release_gate_verified_no_real_phi`')
    expect(markdown).toContain('- Patient data: `false`')
    expect(markdown).toContain('- Push status: not pushed (`28` local commits ahead of origin)')
    expect(markdown).toContain('- Public preview receipt: missing')
    expect(markdown).toContain('- Real-PHI pilot: not in prototype scope')
    expect(markdown).toContain('- Prototype-deferred health-information gates: E2, H2, H3, H4, H5')
    expect(markdown).toContain('## Appendix B Residuals')
    expect(markdown).toContain('- Medium controls tracked: `5`')
    expect(markdown).toContain('- Cross-cutting production subsystems tracked: `8`')
    expect(markdown).toContain('- Named brief demo paths verified: `5`')
    expect(markdown).toContain('- Right-to-erasure tracked: `1`')
    expect(markdown).toContain('- Residual demo blockers: none')
    expect(markdown).toContain('npm run release:gate')
    expect(markdown).toContain('npm run preview:preflight')
    expect(markdown).toContain('npm run preview:verify')
    expect(markdown).toContain('This packet does not prove public deployment, live alias routing, or real-PHI readiness.')
  })

  it('renders public preview receipt details when a receipt is available', () => {
    const publicPreviewReceipt: PreviewDeploymentReceipt = {
      cases: [],
      commit: '8d54984d5a316d7300ec6b474d5563d247989da9',
      deploymentId: 'dpl_receipt_123',
      phi: false,
      proof: ['npm run preview:verify'],
      target: 'vercel_static_preview',
      url: 'https://rhtp-demo.vercel.app/',
      verifiedAt: '2026-07-04T21:30:00.000Z',
    }
    const markdown = renderStakeholderReleasePacketMarkdown(
      createStakeholderReleasePacket({
        ...packetInput,
        publicPreviewReceipt,
        publicPreviewReceiptExists: true,
      }),
    )

    expect(markdown).toContain(
      '- Public preview receipt: recorded: https://rhtp-demo.vercel.app/ | deployment=dpl_receipt_123 | commit=8d54984d5a316d7300ec6b474d5563d247989da9 | verified=2026-07-04T21:30:00.000Z',
    )
  })
})
