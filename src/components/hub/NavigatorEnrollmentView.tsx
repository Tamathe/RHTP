import { CheckCircle2, ShieldCheck, UserCheck, WifiOff } from 'lucide-react'
import { HERO_ID } from '../../data/seed'
import { findNavigatorEnrollmentForPatient } from '../../lib/navigator-enrollment'
import { useStore } from '../../store/useStore'

export function NavigatorEnrollmentView() {
  const sessions = useStore((state) => state.navigatorEnrollmentSessions)
  const identities = useStore((state) => state.patientIdentities)
  const patients = useStore((state) => state.patients)
  const enrollment = findNavigatorEnrollmentForPatient(sessions, HERO_ID)
  const identity = identities.find((candidate) => candidate.id === enrollment?.identityId)
  const patient = patients.find((candidate) => candidate.id === HERO_ID)

  if (!enrollment) {
    return (
      <section className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-center">
        <UserCheck className="mx-auto size-8 text-teal-700" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">In-person enrollment</h2>
        <p className="mt-1 text-sm text-slate-600">No enrollment session is available.</p>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-sm font-bold text-teal-800">
          <UserCheck className="size-4" />
          {enrollment.attestationLabel}
        </div>
        <h2 className="text-xl font-bold text-slate-900">In-person enrollment</h2>
        <p className="text-sm text-slate-600">
          {patient?.name ?? 'Demo patient'} was enrolled through a navigator-attested rural trust
          channel.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-teal-100 bg-teal-50 p-4">
          <div className="text-xs font-bold uppercase text-teal-800">Proofing</div>
          <p className="mt-1 text-lg font-bold text-slate-950">{identity?.proofingStatus}</p>
          <p className="mt-1 text-sm text-slate-700">Identity row linked to the attestation.</p>
        </div>
        <div className="rounded-lg border border-sky-100 bg-sky-50 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-sky-800">
            <WifiOff className="size-4" />
            Offline-capable intake
          </div>
          <p className="mt-1 text-lg font-bold text-slate-950">
            {enrollment.offlineCapable ? 'Ready' : 'Not ready'}
          </p>
          <p className="mt-1 text-sm text-slate-700">Works for waiting-room or low-connectivity setup.</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <div className="text-xs font-bold uppercase text-emerald-800">Trust transfer</div>
          <p className="mt-1 text-lg font-bold text-slate-950">Trust transfer ready</p>
          <p className="mt-1 text-sm text-slate-700">{enrollment.patientLoginHandoff}</p>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <h3 className="font-bold text-slate-900">Enrollment checklist</h3>
        <div className="mt-3 space-y-2">
          {enrollment.steps.map((step) => (
            <div key={step.id} className="flex items-start gap-2 rounded-lg bg-stone-50 p-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-700" />
              <div>
                <p className="text-sm font-bold text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-600">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
          <ShieldCheck className="size-4" />
          Demo boundary
        </div>
        <p className="mt-1 text-xs text-slate-700">
          No real identity proofing or account creation. Production login, credential issuance, and
          legal identity proofing remain blocked outside this stakeholder prototype.
        </p>
      </div>
    </section>
  )
}
