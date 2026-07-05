import { runNavigatorEnrollmentGate } from '../server/navigator-enrollment-gate'

const report = runNavigatorEnrollmentGate()

console.log('RHTP navigator enrollment gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
