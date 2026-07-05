import { describe, expect, it } from 'vitest'

import { createPreviewDeploymentReceipt, formatDeployReceiptLine } from './deploy-receipt'
import type { PublicPreviewGateReport } from './public-preview-gate'

const passingReport: PublicPreviewGateReport = {
  cases: [
    { id: 'public_preview_has_https_url', ok: true, detail: 'https://rhtp-demo.vercel.app/' },
    { id: 'public_preview_has_vercel_deployment_id', ok: true, detail: 'dpl_demo123' },
    { id: 'public_preview_http_200', ok: true, detail: 'status=200' },
    { id: 'public_preview_serves_vite_app_shell', ok: true, detail: 'root and module assets present' },
    { id: 'public_preview_real_phi_flag_is_off', ok: true, detail: 'RHTP_REAL_PHI=unset' },
    { id: 'public_preview_has_no_demo_blockers', ok: true, detail: 'no open demo blockers' },
  ],
  summary: { ok: true, passed: 6, total: 6 },
}

describe('deploy receipt', () => {
  it('creates a one-line no-PHI preview deployment receipt from a passing gate report', () => {
    const receipt = createPreviewDeploymentReceipt({
      commit: '9fda617',
      deploymentId: 'dpl_demo123',
      report: passingReport,
      responseUrl: 'https://rhtp-demo.vercel.app/',
      verifiedAt: '2026-07-04T20:05:00.000Z',
    })
    const line = formatDeployReceiptLine(receipt)

    expect(receipt).toMatchObject({
      target: 'vercel_static_preview',
      url: 'https://rhtp-demo.vercel.app/',
      deploymentId: 'dpl_demo123',
      commit: '9fda617',
      phi: false,
      verifiedAt: '2026-07-04T20:05:00.000Z',
      proof: [
        'npm run preview:verify',
        'GET / returned 200',
        'synthetic/local seed data only',
        'RHTP_REAL_PHI off',
      ],
    })
    expect(receipt.cases.map((testCase) => testCase.id)).toEqual([
      'public_preview_has_https_url',
      'public_preview_has_vercel_deployment_id',
      'public_preview_http_200',
      'public_preview_serves_vite_app_shell',
      'public_preview_real_phi_flag_is_off',
      'public_preview_has_no_demo_blockers',
    ])
    expect(line.endsWith('\n')).toBe(true)
    expect(line.trim()).toEqual(JSON.stringify(receipt))
  })

  it('refuses to create a receipt from a failed public-preview gate report', () => {
    const failedReport: PublicPreviewGateReport = {
      cases: [{ id: 'public_preview_http_200', ok: false, detail: 'status=404' }],
      summary: { ok: false, passed: 0, total: 1 },
    }

    expect(() =>
      createPreviewDeploymentReceipt({
        commit: '9fda617',
        deploymentId: 'dpl_demo123',
        report: failedReport,
        responseUrl: 'https://rhtp-demo.vercel.app/',
        verifiedAt: '2026-07-04T20:05:00.000Z',
      }),
    ).toThrow('Cannot create deployment receipt from a failed public preview gate.')
  })
})
