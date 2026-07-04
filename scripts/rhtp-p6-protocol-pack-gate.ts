import { runP6ProtocolPackGate } from '../server/p6-protocol-pack-gate'

const report = runP6ProtocolPackGate()

console.log('RHTP P6 protocol pack gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
