import { Mic, Radio, UserRound } from 'lucide-react'
import { HERO_ID } from '../../data/seed'
import { useStore } from '../../store/useStore'
import { ProvenanceStrip } from './ProvenanceStrip'
import { SafetyBoundaryCard } from './SafetyBoundaryCard'

const CHIPS = [
  'Why do I need this?',
  'I need a ride',
  'I need a Saturday appointment',
  'I have sudden vision changes',
]

export function VoiceCompanionScreen() {
  const voiceTurns = useStore((state) => state.voiceTurns)
  const redFlagEvents = useStore((state) => state.redFlagEvents)
  const startAutonomousOutreach = useStore((state) => state.startAutonomousOutreach)
  const recordPatientVoiceReply = useStore((state) => state.recordPatientVoiceReply)
  const turns = voiceTurns.filter((turn) => turn.patientId === HERO_ID)
  const latestTurn = turns.at(-1)
  const hasOpenRedFlag = redFlagEvents.some(
    (event) => event.patientId === HERO_ID && event.status === 'open',
  )

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-teal-700 p-4 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Radio className="size-4" />
          Sandy voice companion
        </div>
        <h2 className="mt-2 text-2xl font-bold">Start with voice</h2>
        <p className="mt-2 text-sm text-teal-50">
          This voice flow stays inside the visible source facts and safety limits below. Sandy
          can explain the eye screening gap, use the visible site availability fact to help pick a
          site, collect barriers, and call in a navigator when the protocol says a human should
          help.
        </p>
        <button
          disabled={hasOpenRedFlag}
          onClick={() => startAutonomousOutreach(HERO_ID)}
          className={`mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-teal-800 ${
            hasOpenRedFlag ? 'cursor-not-allowed opacity-60' : ''
          }`}
        >
          <Mic className="size-4" />
          Start voice outreach
        </button>
      </section>

      <div className="space-y-2">
        {turns.map((turn) => (
          <div
            key={turn.id}
            className={`rounded-lg p-3 text-sm ${
              turn.speaker === 'sandy' ? 'bg-stone-100 text-slate-800' : 'bg-teal-50 text-teal-950'
            }`}
          >
            <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
              {turn.speaker === 'sandy' ? <Mic className="size-3" /> : <UserRound className="size-3" />}
              {turn.speaker}
            </div>
            {turn.text}
          </div>
        ))}
      </div>

      {(latestTurn?.safety === 'red_flag' || hasOpenRedFlag) && (
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          That could be urgent. Sandy cannot diagnose this, so a navigator should help you get
          human guidance now. Routine voice coaching is paused until that review happens.
        </section>
      )}

      <div className="grid grid-cols-2 gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            disabled={hasOpenRedFlag}
            onClick={() => recordPatientVoiceReply(HERO_ID, chip)}
            className={`rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 ${
              hasOpenRedFlag ? 'cursor-not-allowed opacity-60' : ''
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      <ProvenanceStrip
        patientId={HERO_ID}
        labels={['Diabetes diagnosis', 'Retinal screening gap', 'Screening site availability']}
      />
      <SafetyBoundaryCard />
    </div>
  )
}
