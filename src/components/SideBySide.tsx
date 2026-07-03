import { HubShell } from './hub/HubShell'
import { PhoneApp } from './phone/PhoneApp'
import { ResetButton } from './ResetButton'

export function SideBySide() {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-2">
        <span className="text-sm font-bold text-slate-700">RHTP - Overdue to Closed Loop</span>
        <ResetButton />
      </div>
      <div className="flex flex-col gap-6 p-6 lg:flex-row">
        <div className="shrink-0">
          <PhoneApp />
        </div>
        <div className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50">
          <HubShell />
        </div>
      </div>
    </div>
  )
}
