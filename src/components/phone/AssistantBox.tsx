import { useState } from 'react'
import { Send } from 'lucide-react'
import type { ScriptedAnswer } from '../../lib/ai-script'
import { resolveAnswer } from '../../lib/ai-script'
import { useStore } from '../../store/useStore'

export function AssistantBox({
  patientId,
  surface,
  chips,
}: {
  patientId: string
  surface: string
  chips: ScriptedAnswer[]
}) {
  const askQuestion = useStore((state) => state.askQuestion)
  const [answer, setAnswer] = useState<string | null>(null)
  const [text, setText] = useState('')

  const ask = (input: string) => {
    askQuestion(patientId, input, surface)
    setAnswer(resolveAnswer(input, chips))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.chip}
            onClick={() => ask(chip.chip)}
            className="rounded-full border border-teal-300 bg-white px-3 py-1.5 text-sm font-semibold text-teal-800 hover:bg-teal-50"
          >
            {chip.chip}
          </button>
        ))}
      </div>
      {answer && <div className="rounded-lg bg-stone-100 p-3 text-sm text-slate-800">{answer}</div>}
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ask a question..."
          className="min-w-0 flex-1 rounded-full border border-stone-300 px-3 py-2 text-sm"
        />
        <button
          aria-label="Ask"
          onClick={() => {
            if (text.trim()) {
              ask(text)
              setText('')
            }
          }}
          className="rounded-full bg-teal-700 p-2 text-white hover:bg-teal-800"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  )
}
