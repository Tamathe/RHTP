import { runH4BreakGlassGate } from '../server/h4-break-glass-gate'

const report = runH4BreakGlassGate()

console.log('RHTP H4 break-glass gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
