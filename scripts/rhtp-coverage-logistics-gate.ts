import { runCoverageLogisticsGate } from '../server/coverage-logistics-gate'

const report = runCoverageLogisticsGate()

console.log('RHTP coverage logistics gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
