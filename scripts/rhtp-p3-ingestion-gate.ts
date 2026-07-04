import { runP3IngestionGate } from '../server/p3-ingestion-gate'

const report = runP3IngestionGate()

console.log('RHTP P3 ingestion rail gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
