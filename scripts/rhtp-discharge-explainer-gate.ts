import { runDischargeExplainerGate } from '../server/discharge-explainer-gate'

const report = runDischargeExplainerGate()

console.log('RHTP discharge explainer gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
