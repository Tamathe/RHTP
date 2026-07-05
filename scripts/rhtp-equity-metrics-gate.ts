import { runEquityMetricsGate } from '../server/equity-metrics-gate'

const report = runEquityMetricsGate()

console.log('RHTP equity metrics gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
