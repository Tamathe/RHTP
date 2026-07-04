import { runH5SmsGate } from '../server/sms-gate'

const report = runH5SmsGate()

console.log('RHTP H5 SMS disclosure gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(
    `- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.decision}${
      testCase.reason ? `, ${testCase.reason}` : ''
    })`,
  )
}
console.log(`Disclosure leakage: ${report.summary.disclosureLeakageBlocked ? 'blocked' : 'not blocked'}`)

if (!report.summary.ok) {
  process.exitCode = 1
}
