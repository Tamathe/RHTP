import { runD4PdcGate } from '../server/d4-pdc-gate'

const report = runD4PdcGate()

console.log('RHTP D4 PDC adherence gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
