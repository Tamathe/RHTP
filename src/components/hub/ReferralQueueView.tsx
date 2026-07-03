import { useStore } from '../../store/useStore'

export function ReferralQueueView() {
  const referrals = useStore((state) => state.referrals)
  const patients = useStore((state) => state.patients)
  const nameOf = (id: string) => patients.find((patient) => patient.id === id)?.name ?? id

  return (
    <div>
      <h2 className="mb-4 text-xl font-extrabold">Referral queue</h2>
      <div className="overflow-x-auto md:overflow-visible">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Patient</th>
              <th>Reason</th>
              <th>Destination</th>
              <th>Owner</th>
              <th>Days</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((referral) => (
              <tr key={referral.id} className="border-b border-stone-100 last:border-0">
                <td className="py-2 font-semibold text-slate-900">{nameOf(referral.patientId)}</td>
                <td className="text-slate-600">{referral.reason.replace('_', ' ')}</td>
                <td className="text-slate-600">{referral.destination}</td>
                <td className="text-slate-600">{referral.owner}</td>
                <td className="text-slate-600">{referral.daysSinceResult}</td>
                <td>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {referral.daysSinceResult > 3 ? 'Likely to miss follow-up' : referral.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
