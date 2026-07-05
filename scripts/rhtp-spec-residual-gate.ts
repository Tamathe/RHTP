import { runSpecResidualGate } from '../server/spec-residual-gate'

const report = runSpecResidualGate()

console.log('RHTP Appendix B residual gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
