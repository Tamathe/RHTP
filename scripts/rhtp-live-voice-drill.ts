import { HERO_ID } from '../src/data/seed'
import { runLiveVoiceDrill } from '../server/live-voice-drill'
import { createInitialBackendState } from '../server/state'

const allowProviderMint =
  process.env.RHTP_LIVE_VOICE_PROVIDER_MINT === '1' ||
  process.env.RHTP_LIVE_VOICE_PROVIDER_MINT === 'true'

const report = await runLiveVoiceDrill(createInitialBackendState(), {
  patientId: process.env.RHTP_LIVE_VOICE_PATIENT_ID ?? HERO_ID,
  allowProviderMint,
})

console.log('RHTP live Realtime voice drill preflight')
console.log(`Status: ${report.status}`)
if (report.missingPrerequisites.length > 0) {
  console.log(`Missing prerequisites: ${report.missingPrerequisites.join(', ')}`)
} else {
  console.log('Missing prerequisites: none')
}

if (report.providerMint.attempted) {
  if (report.providerMint.ok) {
    console.log(
      `Provider client-secret mint: pass (${report.providerMint.latencyMs}ms, ${report.providerMint.model})`,
    )
    console.log(`Client secret returned: ${report.providerMint.clientSecretReturned ? 'yes' : 'no'}`)
  } else {
    console.log(
      `Provider client-secret mint: fail (${report.providerMint.latencyMs}ms, ${report.providerMint.reason})`,
    )
    console.log(report.providerMint.error)
  }
} else {
  console.log('Provider client-secret mint: not attempted')
}

console.log(`Live browser audio measured: ${report.liveAudio.measured ? 'yes' : 'no'}`)
console.log(report.liveAudio.reason)

if (report.status === 'blocked') {
  process.exitCode = 1
}
