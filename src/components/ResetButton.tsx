import { RotateCcw } from 'lucide-react'
import { useStore } from '../store/useStore'

export function ResetButton() {
  const reset = useStore((state) => state.reset)

  return (
    <button
      onClick={reset}
      className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-stone-100"
    >
      <RotateCcw className="size-4" /> Reset demo
    </button>
  )
}
