import { runH3Part2Gate } from '../server/part2-gate'

const report = runH3Part2Gate()

console.log('RHTP H3 Part 2 suppression gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(
    `- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.decision}, sensitiveTextSuppressed=${testCase.sensitiveTextSuppressed}, auditRecorded=${testCase.auditRecorded})`,
  )
}
console.log(`Sensitive facility/category text: ${report.summary.sensitiveTextSuppressed ? 'suppressed' : 'leaked'}`)

if (!report.summary.ok) {
  process.exitCode = 1
}
