import { runP7ScreeningsCampaignsGate } from '../server/p7-screenings-campaigns-gate'

const report = runP7ScreeningsCampaignsGate()

console.log('RHTP P7 screenings and campaigns gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
