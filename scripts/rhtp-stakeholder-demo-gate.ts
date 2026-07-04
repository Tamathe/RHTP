import { runStakeholderDemoGate } from '../server/stakeholder-demo-gate'

const report = runStakeholderDemoGate()

console.log('RHTP stakeholder no-PHI demo gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
