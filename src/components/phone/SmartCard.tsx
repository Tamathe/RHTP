import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

export function SmartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-teal-100 bg-teal-50 p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase text-teal-700">
        <Sparkles className="size-3.5" /> Sandy
      </div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-700">{children}</div>
    </div>
  )
}
