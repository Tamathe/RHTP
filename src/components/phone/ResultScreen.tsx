import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { HERO_ID } from '../../data/seed'
import { useStore } from '../../store/useStore'
import { SmartCard } from './SmartCard'

export function ResultScreen() {
  const gap = useStore((state) => state.gaps.find((item) => item.patientId === HERO_ID)!)
  const state = gap.status === 'referral' ? 'referral' : gap.status === 'repeat' ? 'repeat' : 'normal'

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-extrabold text-slate-900">Your result</h1>
      {state === 'normal' && (
        <>
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="size-6" />
            <span className="font-bold">Screening completed - looks good</span>
          </div>
          <SmartCard title="What this means">
            Your screening was completed and no referral is needed right now. We will remind you
            next year. Keep up your regular diabetes care.
          </SmartCard>
        </>
      )}
      {state === 'referral' && (
        <>
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="size-6" />
            <span className="font-bold">A closer look is recommended</span>
          </div>
          <SmartCard title="What happens next">
            Your images suggest you should follow-up with an eye specialist. This is common and
            treatable when caught early. A navigator can help you book the visit.
          </SmartCard>
        </>
      )}
      {state === 'repeat' && (
        <>
          <div className="flex items-center gap-2 text-teal-700">
            <RefreshCw className="size-6" />
            <span className="font-bold">Let's retake the photo</span>
          </div>
          <SmartCard title="What happens next">
            The image could not be read clearly, which happens sometimes. A quick repeat screening
            is all that is needed. A navigator can help you reschedule.
          </SmartCard>
        </>
      )}
    </div>
  )
}
