import { describe, expect, it } from 'vitest'

import { latestPreviewDeploymentReceipt, summarizePreviewDeploymentReceipt } from './deploy-receipt-log'
import type { PreviewDeploymentReceipt } from './deploy-receipt'

function receipt(input: Partial<PreviewDeploymentReceipt>): PreviewDeploymentReceipt {
  return {
    cases: [],
    commit: 'commit-a',
    deploymentId: 'dpl_a',
    phi: false,
    proof: ['npm run preview:verify'],
    target: 'vercel_static_preview',
    url: 'https://a.vercel.app/',
    verifiedAt: '2026-07-04T20:00:00.000Z',
    ...input,
  }
}

describe('deploy receipt log', () => {
  it('returns the latest preview deployment receipt from JSONL text', () => {
    const older = receipt({ commit: 'commit-a', deploymentId: 'dpl_a', url: 'https://a.vercel.app/' })
    const newer = receipt({
      commit: 'commit-b',
      deploymentId: 'dpl_b',
      url: 'https://b.vercel.app/',
      verifiedAt: '2026-07-04T21:00:00.000Z',
    })

    expect(latestPreviewDeploymentReceipt(`${JSON.stringify(older)}\n\n${JSON.stringify(newer)}\n`)).toEqual(newer)
  })

  it('returns undefined when the receipt log is empty', () => {
    expect(latestPreviewDeploymentReceipt('\n\n')).toBeUndefined()
  })

  it('summarizes the receipt for deploy status output', () => {
    expect(
      summarizePreviewDeploymentReceipt(
        receipt({
          commit: 'commit-b',
          deploymentId: 'dpl_b',
          url: 'https://b.vercel.app/',
          verifiedAt: '2026-07-04T21:00:00.000Z',
        }),
      ),
    ).toBe('recorded: https://b.vercel.app/ | deployment=dpl_b | commit=commit-b | verified=2026-07-04T21:00:00.000Z')
  })
})
