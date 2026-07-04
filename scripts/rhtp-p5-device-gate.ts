import { runP5DeviceGate } from '../server/p5-device-gate'

const report = runP5DeviceGate()

console.log('RHTP P5 device rail gate')
console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
for (const testCase of report.cases) {
  console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
}

if (!report.summary.ok) {
  process.exitCode = 1
}
