import { runP8WritebackGate } from '../server/p8-writeback-gate'

const report = runP8WritebackGate()

console.log('RHTP P8 writeback gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
