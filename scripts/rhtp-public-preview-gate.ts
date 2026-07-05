import { runPublicPreviewGate } from '../server/public-preview-gate'

function requiredEnv(name: 'RHTP_PREVIEW_URL' | 'RHTP_DEPLOYMENT_ID'): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
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
      console.log(
        `Receipt: target=vercel_static_preview url=${response.url} deploymentId=${deploymentId} phi=false`,
      )
    } else {
      process.exitCode = 1
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

await main()
