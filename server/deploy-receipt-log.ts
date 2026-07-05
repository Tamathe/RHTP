import type { PreviewDeploymentReceipt } from './deploy-receipt'

export function latestPreviewDeploymentReceipt(logText: string): PreviewDeploymentReceipt | undefined {
  const receipts = logText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as PreviewDeploymentReceipt)

  return receipts.at(-1)
}

export function summarizePreviewDeploymentReceipt(receipt: PreviewDeploymentReceipt): string {
  return `recorded: ${receipt.url} | deployment=${receipt.deploymentId} | commit=${receipt.commit} | verified=${receipt.verifiedAt}`
}
