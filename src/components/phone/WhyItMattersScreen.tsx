import { HERO_ID } from '../../data/seed'
import { WHY_CHIPS } from '../../lib/ai-script'
import { AssistantBox } from './AssistantBox'
import { SmartCard } from './SmartCard'

export function WhyItMattersScreen() {
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-extrabold text-slate-900">Why it matters</h1>
      <p className="text-sm text-slate-700">
        Diabetic eye disease can develop silently, often with no symptoms until vision is already
        affected. A quick screening catches it early, when it is most treatable.
      </p>
      <SmartCard title="For you specifically">
        Your last A1C was 8.4, and it has been 19 months since your last screening. That combination
        is why a screening is recommended now. This does not diagnose eye disease.
      </SmartCard>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        If you have sudden vision changes, flashes, or floaters, contact a clinician right away.
      </div>
      <div>
        <div className="mb-2 text-sm font-bold text-slate-700">Ask why this matters for you</div>
        <AssistantBox patientId={HERO_ID} surface="why" chips={WHY_CHIPS} />
      </div>
    </div>
  )
}
