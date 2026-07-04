import { runD2AdolescentConsentGate } from '../server/d2-adolescent-consent-gate'

const report = runD2AdolescentConsentGate()

console.log('RHTP D2 adolescent consent gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
