import { runH2AsyncAccessGate } from '../server/async-access-gate'

const report = runH2AsyncAccessGate()

console.log('RHTP H2 async access gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(
    `- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.decision}${
      testCase.reason ? `, ${testCase.reason}` : ''
    }, auditRecorded=${testCase.auditRecorded})`,
  )
}
console.log(`Standing broad async grant: ${report.summary.broadGrantBlocked ? 'blocked' : 'not blocked'}`)

if (!report.summary.ok) {
  process.exitCode = 1
}
