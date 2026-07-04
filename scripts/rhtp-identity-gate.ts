import { runE2IdentityGate } from '../server/identity-gate'

const report = runE2IdentityGate()

console.log('RHTP E2 identity gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(
    `- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.decision}, autonomousOutreachAllowed=${testCase.autonomousOutreachAllowed}, queueCreated=${testCase.queueCreated})`,
  )
}
console.log(
  `Wrong-patient autonomous outreach: ${
    report.summary.wrongPatientAutonomousOutreachBlocked ? 'blocked' : 'not blocked'
  }`,
)

if (!report.summary.ok || !report.summary.wrongPatientAutonomousOutreachBlocked) {
  process.exitCode = 1
}
