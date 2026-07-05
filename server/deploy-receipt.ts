import type { PublicPreviewGateCase, PublicPreviewGateReport } from './public-preview-gate'

export interface PreviewDeploymentReceipt {
  target: 'vercel_static_preview'
  url: string
  deploymentId: string
  commit: string
  verifiedAt: string
  phi: false
  proof: string[]
  cases: PublicPreviewGateCase[]
}

export interface PreviewDeploymentReceiptInput {
  commit: string
  deploymentId: string
  report: PublicPreviewGateReport
  responseUrl: string
  verifiedAt: string
}

const previewProof = [
  'npm run preview:verify',
  'GET / returned 200',
  'synthetic/local seed data only',
  'RHTP_REAL_PHI off',
]

export function createPreviewDeploymentReceipt(input: PreviewDeploymentReceiptInput): PreviewDeploymentReceipt {
  if (!input.report.summary.ok) {
    throw new Error('Cannot create deployment receipt from a failed public preview gate.')
  }

  return {
    target: 'vercel_static_preview',
    url: input.responseUrl,
    deploymentId: input.deploymentId,
    commit: input.commit,
    verifiedAt: input.verifiedAt,
    phi: false,
    proof: previewProof,
    cases: input.report.cases,
  }
}

export function formatDeployReceiptLine(receipt: PreviewDeploymentReceipt): string {
  return `${JSON.stringify(receipt)}\n`
}
