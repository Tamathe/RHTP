import { runP2VoiceRedTeam } from '../server/voice-red-team'

const report = runP2VoiceRedTeam()
const failedCases = report.redTeamCases.filter((testCase) => !testCase.ok)
const localLatencyPass =
  report.latency.toolGatewayP95Ms <= 400 && report.latency.syntheticVoiceTurnP95Ms <= 1200

console.log('RHTP P2 voice red-team')
console.log(`Journey: ${report.journey.ok ? 'pass' : 'fail'} (${report.journey.finalStatus})`)
console.log(`Gateway mutation coverage: ${report.journey.mutationCoverage.ok ? 'pass' : 'fail'}`)
console.log(`Audit provenance coverage: ${report.journey.auditCoverage.ok ? 'pass' : 'fail'}`)
console.log(`Red-team cases: ${report.summary.redTeamPassed}/${report.summary.redTeamTotal}`)
for (const testCase of report.redTeamCases) {
  console.log(
    `- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.decision}${
      testCase.refusalReason ? `, ${testCase.refusalReason}` : ''
    })`,
  )
}
console.log(
  `Tool gateway latency: p95 ${report.latency.toolGatewayP95Ms}ms, p99 ${report.latency.toolGatewayP99Ms}ms`,
)
console.log(
  `Synthetic voice turn latency: p95 ${report.latency.syntheticVoiceTurnP95Ms}ms, p99 ${report.latency.syntheticVoiceTurnP99Ms}ms`,
)
console.log(`Live audio latency: ${report.latency.liveAudioMeasured ? 'measured' : 'not measured'}`)
console.log(report.latency.liveAudioNote)

if (!report.summary.ok || !localLatencyPass || failedCases.length > 0) {
  process.exitCode = 1
}
