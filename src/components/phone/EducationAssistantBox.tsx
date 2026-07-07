import { useState } from 'react'
import { AlertTriangle, Send, Sparkles } from 'lucide-react'
import { screenPatientMessage } from '../../lib/safety'
import {
  EDUCATION_CHIPS,
  answerEducationQuestion,
  isAcuteVisionConcern,
} from '../../lib/retinopathy-education'
import { useStore } from '../../store/useStore'

type Tone = 'answer' | 'muted' | 'alert'

interface AnswerState {
  tone: Tone
  text: string
  source?: string
}

export function EducationAssistantBox({ patientId }: { patientId: string }) {
  const askEducationQuestion = useStore((state) => state.askEducationQuestion)
  const [result, setResult] = useState<AnswerState | null>(null)
  const [text, setText] = useState('')

  const ask = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return

    const screened = screenPatientMessage(trimmed)
    askEducationQuestion(patientId, trimmed)

    if (screened.category === 'red_flag' || isAcuteVisionConcern(trimmed)) {
      const lead =
        screened.category === 'red_flag'
          ? screened.patientCopy
          : "That could be urgent. Sandy can't diagnose this, so a person should help you right away."
      setResult({
        tone: 'alert',
        text: `${lead} A navigator has been alerted to help you get human guidance now.`,
      })
      return
    }

    if (screened.category === 'off_protocol') {
      setResult({ tone: 'muted', text: screened.patientCopy })
      return
    }

    const answer = answerEducationQuestion(trimmed)
    if (answer.kind === 'answer') {
      setResult({ tone: 'answer', text: answer.text, source: answer.source })
    } else {
      setResult({ tone: 'muted', text: answer.text })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {EDUCATION_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => ask(chip)}
            className="rounded-full border border-teal-300 bg-white px-3 py-1.5 text-sm font-semibold text-teal-800 hover:bg-teal-50"
          >
            {chip}
          </button>
        ))}
      </div>

      {result && result.tone === 'alert' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <div className="mb-1 flex items-center gap-1.5 font-bold">
            <AlertTriangle className="size-4" /> This may be urgent
          </div>
          {result.text}
        </div>
      )}

      {result && result.tone === 'answer' && (
        <div className="rounded-lg border border-teal-100 bg-teal-50 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase text-teal-700">
            <Sparkles className="size-3.5" /> Sandy
          </div>
          <div className="text-sm text-slate-800">{result.text}</div>
          {result.source && (
            <div className="mt-2 text-[11px] font-semibold text-slate-500">{result.source}</div>
          )}
        </div>
      )}

      {result && result.tone === 'muted' && (
        <div className="rounded-lg bg-stone-100 p-3 text-sm text-slate-800">{result.text}</div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              ask(text)
              setText('')
            }
          }}
          placeholder="Ask Sandy about diabetic retinopathy..."
          className="min-w-0 flex-1 rounded-full border border-stone-300 px-3 py-2 text-sm"
        />
        <button
          aria-label="Ask"
          onClick={() => {
            ask(text)
            setText('')
          }}
          className="rounded-full bg-teal-700 p-2 text-white hover:bg-teal-800"
        >
          <Send className="size-4" />
        </button>
      </div>

      <p className="text-[11px] text-slate-500">
        Sandy explains and answers questions in plain language. This is general education, not a
        diagnosis. Urgent symptoms go to a human right away.
      </p>
    </div>
  )
}
