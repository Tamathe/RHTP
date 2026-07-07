import { AlertTriangle, CalendarClock, CheckCircle2, Eye, RefreshCw } from 'lucide-react'
import { HERO_ID } from '../../data/seed'
import { useStore } from '../../store/useStore'
import { SmartCard } from './SmartCard'

export function ResultScreen() {
  const gap = useStore((state) => state.gaps.find((item) => item.patientId === HERO_ID)!)
  const sites = useStore((state) => state.sites)
  const carePlanTasks = useStore((state) => state.carePlanTasks)

  const scheduledTask = [...carePlanTasks]
    .reverse()
    .find((task) => task.patientId === HERO_ID && task.step === 'attend_screening')
  const scheduledSite = sites.find((site) => site.id === scheduledTask?.siteId)

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-extrabold text-slate-900">Your result</h1>

      {gap.status === 'scheduled' && (
        <>
          <div className="flex items-center gap-2 text-teal-700">
            <CalendarClock className="size-6" />
            <span className="font-bold">Screening requested</span>
          </div>
          <SmartCard title="What happens next">
            You asked to be seen at {scheduledSite?.name ?? 'your chosen location'}
            {scheduledTask?.when ? ` on ${scheduledTask.when}` : ''}. Your navigator will confirm the
            time and your coverage, then you are set. Your eye images have not been taken yet — your
            screening result will appear here after your visit.
          </SmartCard>
        </>
      )}

      {gap.status === 'referral' && (
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

      {gap.status === 'repeat' && (
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

      {(gap.status === 'completed' || gap.status === 'closed') && (
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

      {(gap.status === 'overdue' || gap.status === 'engaged') && (
        <>
          <div className="flex items-center gap-2 text-slate-600">
            <Eye className="size-6" />
            <span className="font-bold">No screening yet</span>
          </div>
          <SmartCard title="What to do">
            You have not completed an eye screening yet. When you are ready, find a location and
            request a time. Your screening result will appear here after your visit.
          </SmartCard>
        </>
      )}
    </div>
  )
}
