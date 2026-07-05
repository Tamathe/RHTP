import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createPreviewDeploymentReceipt, formatDeployReceiptLine } from '../server/deploy-receipt'
import { runPublicPreviewGate } from '../server/public-preview-gate'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultReceiptPath = resolve(rootDir, 'docs/ops/RHTP-DEPLOY-RECEIPTS.jsonl')

function requiredEnv(name: 'RHTP_PREVIEW_URL' | 'RHTP_DEPLOYMENT_ID'): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function optionalEnv(name: 'RHTP_DEPLOY_COMMIT' | 'RHTP_PREVIEW_RECEIPT_PATH'): string | undefined {
  const value = process.env[name]?.trim()
  return value === undefined || value.length === 0 ? undefined : value
}

function currentCommit(): string {
  return (
    optionalEnv('RHTP_DEPLOY_COMMIT') ??
    execFileSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).trim()
  )
}

function shouldRecordReceipt(): boolean {
  return process.env.RHTP_RECORD_PREVIEW_RECEIPT === '1'
}

function printReport(responseUrl: string, report: ReturnType<typeof runPublicPreviewGate>): void {
  console.log('RHTP public preview deployment gate')
  console.log(`URL: ${responseUrl}`)
  console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
  for (const testCase of report.cases) {
    console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
  }
}

async function fetchPreview(url: string): Promise<Response> {
  return await fetch(url, {
    redirect: 'follow',
  })
}

async function main(): Promise<void> {
  try {
    const deploymentUrl = requiredEnv('RHTP_PREVIEW_URL')
    const deploymentId = requiredEnv('RHTP_DEPLOYMENT_ID')
    const commit = currentCommit()
    const response = await fetchPreview(deploymentUrl)
    const responseBody = await response.text()
    const report = runPublicPreviewGate({
      deploymentId,
      deploymentUrl,
      responseBody,
      responseStatus: response.status,
    })

    printReport(response.url, report)

    if (report.summary.ok) {
      const receipt = createPreviewDeploymentReceipt({
        commit,
        deploymentId,
        report,
        responseUrl: response.url,
        verifiedAt: new Date().toISOString(),
      })
      const receiptLine = formatDeployReceiptLine(receipt)
      console.log(`Receipt: ${receiptLine.trim()}`)

      if (shouldRecordReceipt()) {
        const receiptPath = optionalEnv('RHTP_PREVIEW_RECEIPT_PATH') ?? defaultReceiptPath
        appendFileSync(receiptPath, receiptLine, 'utf8')
        console.log(`Recorded receipt: ${receiptPath}`)
      }
    } else {
      process.exitCode = 1
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

await main()
