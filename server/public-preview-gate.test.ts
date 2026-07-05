import { describe, expect, it } from 'vitest'

import { runPublicPreviewGate } from './public-preview-gate'

const appShell = '<!doctype html><div id="root"></div><script type="module" src="/assets/index.js"></script>'

describe('runPublicPreviewGate', () => {
  it('passes the public no-PHI preview deployment contract', () => {
    const report = runPublicPreviewGate({
      deploymentId: 'dpl_demo123',
      deploymentUrl: 'https://rhtp-demo.vercel.app/',
      env: {},
      responseBody: appShell,
      responseStatus: 200,
    })

    expect(report.summary).toEqual({ ok: true, passed: 6, total: 6 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'public_preview_has_https_url',
      'public_preview_has_vercel_deployment_id',
      'public_preview_http_200',
      'public_preview_serves_vite_app_shell',
      'public_preview_real_phi_flag_is_off',
      'public_preview_has_no_demo_blockers',
    ])
  })

  it('fails without a Vercel deployment id', () => {
    const report = runPublicPreviewGate({
      deploymentId: '',
      deploymentUrl: 'https://rhtp-demo.vercel.app/',
      env: {},
      responseBody: appShell,
      responseStatus: 200,
    })

    expect(report.summary.ok).toBe(false)
    expect(report.cases.find((testCase) => testCase.id === 'public_preview_has_vercel_deployment_id')).toMatchObject({
      ok: false,
      detail: 'deployment id missing',
    })
  })

  it('fails when the URL is not HTTPS', () => {
    const report = runPublicPreviewGate({
      deploymentId: 'dpl_demo123',
      deploymentUrl: 'http://127.0.0.1:4174/',
      env: {},
      responseBody: appShell,
      responseStatus: 200,
    })

    expect(report.summary.ok).toBe(false)
    expect(report.cases.find((testCase) => testCase.id === 'public_preview_has_https_url')).toMatchObject({
      ok: false,
      detail: 'http://127.0.0.1:4174/',
    })
  })

  it('fails when real-PHI is enabled', () => {
    const report = runPublicPreviewGate({
      deploymentId: 'dpl_demo123',
      deploymentUrl: 'https://rhtp-demo.vercel.app/',
      env: { RHTP_REAL_PHI: '1' },
      responseBody: appShell,
      responseStatus: 200,
    })

    expect(report.summary.ok).toBe(false)
    expect(report.cases.find((testCase) => testCase.id === 'public_preview_real_phi_flag_is_off')).toMatchObject({
      ok: false,
      detail: 'RHTP_REAL_PHI=1',
    })
  })
})
