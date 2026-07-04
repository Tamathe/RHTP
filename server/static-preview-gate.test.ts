import { describe, expect, it } from 'vitest'

import { runStaticPreviewGate } from './static-preview-gate'

const validVercelConfig = {
  rewrites: [{ source: '/(.*)', destination: '/index.html' }],
}

describe('runStaticPreviewGate', () => {
  it('passes the local static preview readiness contract', () => {
    const report = runStaticPreviewGate({
      env: {},
      responseBody: '<!doctype html><div id="root"></div><script type="module" src="/assets/index.js"></script>',
      responseStatus: 200,
      vercelConfig: validVercelConfig,
    })

    expect(report.summary).toEqual({ ok: true, passed: 5, total: 5 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'static_preview_http_200',
      'static_preview_serves_vite_app_shell',
      'static_preview_spa_rewrite_configured',
      'static_preview_real_phi_flag_is_off',
      'static_preview_has_no_demo_blockers',
    ])
  })

  it('fails when real-PHI is enabled', () => {
    const report = runStaticPreviewGate({
      env: { RHTP_REAL_PHI: 'true' },
      responseBody: '<div id="root"></div><script type="module" src="/assets/index.js"></script>',
      responseStatus: 200,
      vercelConfig: validVercelConfig,
    })

    expect(report.summary.ok).toBe(false)
    expect(report.cases.find((testCase) => testCase.id === 'static_preview_real_phi_flag_is_off')).toMatchObject({
      ok: false,
      detail: 'RHTP_REAL_PHI=true',
    })
  })

  it('fails without the Vercel SPA rewrite', () => {
    const report = runStaticPreviewGate({
      env: {},
      responseBody: '<div id="root"></div><script type="module" src="/assets/index.js"></script>',
      responseStatus: 200,
      vercelConfig: { rewrites: [] },
    })

    expect(report.summary.ok).toBe(false)
    expect(report.cases.find((testCase) => testCase.id === 'static_preview_spa_rewrite_configured')).toMatchObject({
      ok: false,
      detail: 'missing /(.*) -> /index.html rewrite',
    })
  })
})
