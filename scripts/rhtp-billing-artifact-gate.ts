import { runBillingArtifactGate } from '../server/billing-artifact-gate'

const report = runBillingArtifactGate()

console.log('RHTP billing artifact gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
