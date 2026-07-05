import { describe, expect, it } from 'vitest'

import releaseLedger from '../docs/ops/rhtp-release-ledger.json'
import packageJson from '../package.json'
import {
  runPublicPreviewPreflight,
  type PublicPreviewPreflightGitState,
  type PublicPreviewPreflightLedger,
} from './public-preview-preflight'

const cleanPushedGit: PublicPreviewPreflightGitState = {
  aheadOfOrigin: 0,
  branch: 'master',
  dirty: false,
  hasUpstream: true,
}

describe('public preview preflight', () => {
  it('is exposed as an npm script separate from the local release gate', () => {
    expect(packageJson.scripts['preview:preflight']).toBe('tsx scripts/rhtp-public-preview-preflight.ts')
    expect(packageJson.scripts['release:gate']).not.toContain('preview:preflight')
  })

  it('passes when local release is verified, repo is pushed, Vercel is linked, and real PHI is off', () => {
    const report = runPublicPreviewPreflight({
      env: {},
      git: cleanPushedGit,
      ledger: releaseLedger as PublicPreviewPreflightLedger,
      vercelProjectLinked: true,
    })

    expect(report.summary).toEqual({ ok: true, passed: 6, total: 6 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'preview_preflight_local_release_verified',
      'preview_preflight_real_phi_flag_is_off',
      'preview_preflight_working_tree_clean',
      'preview_preflight_branch_has_upstream',
      'preview_preflight_local_commits_pushed',
      'preview_preflight_vercel_project_linked',
    ])
  })

  it('fails closed when push or Vercel link prerequisites are missing', () => {
    const report = runPublicPreviewPreflight({
      env: {},
      git: {
        ...cleanPushedGit,
        aheadOfOrigin: 42,
      },
      ledger: releaseLedger as PublicPreviewPreflightLedger,
      vercelProjectLinked: false,
    })

    expect(report.summary).toEqual({ ok: false, passed: 4, total: 6 })
    expect(report.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'preview_preflight_local_commits_pushed',
          ok: false,
          detail: '42 commits ahead of origin',
        }),
        expect.objectContaining({
          id: 'preview_preflight_vercel_project_linked',
          ok: false,
          detail: '.vercel/project.json missing',
        }),
      ]),
    )
  })

  it('blocks real-PHI flag drift before public preview work starts', () => {
    const report = runPublicPreviewPreflight({
      env: { RHTP_REAL_PHI: '1' },
      git: cleanPushedGit,
      ledger: releaseLedger as PublicPreviewPreflightLedger,
      vercelProjectLinked: true,
    })

    expect(report.summary.ok).toBe(false)
    expect(report.cases).toContainEqual({
      id: 'preview_preflight_real_phi_flag_is_off',
      ok: false,
      detail: 'RHTP_REAL_PHI=1',
    })
  })
})
