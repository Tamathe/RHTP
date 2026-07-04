export type HealthAlertType = 'medication' | 'blood_pressure' | 'symptom_log'
export type HealthAlertStatus = 'due' | 'upcoming' | 'completed'

export interface HealthAlert {
  id: string
  type: HealthAlertType
  title: string
  detail: string
  status: HealthAlertStatus
  nextDueLabel: string
  channel: 'In-app reminder'
  safety: string
  completedAt?: string
  snoozedUntil?: string
}

export interface HealthAlertCounts {
  due: number
  upcoming: number
  completed: number
}

const NOW = '2026-07-04T09:00:00'
const SNOOZED_UNTIL = '2026-07-04T09:30:00'

export const seedHealthAlerts: HealthAlert[] = [
  {
    id: 'alert_med_evening',
    type: 'medication',
    title: 'Take evening medication',
    detail: 'Metformin evening dose reminder. Confirm once taken or snooze if now is not a good time.',
    status: 'due',
    nextDueLabel: 'Due now',
    channel: 'In-app reminder',
    safety: 'Do not change medication doses here. Ask Sandy or your care team about side effects, missed doses, or cost barriers.',
  },
  {
    id: 'alert_bp_morning',
    type: 'blood_pressure',
    title: 'Check blood pressure',
    detail: 'Use your home cuff and log the reading before breakfast so trends are easier to review.',
    status: 'due',
    nextDueLabel: 'Due now',
    channel: 'In-app reminder',
    safety: 'This reminder does not diagnose urgent blood pressure symptoms. Seek human guidance for severe symptoms.',
  },
  {
    id: 'alert_symptoms_evening',
    type: 'symptom_log',
    title: 'Log symptoms',
    detail: 'Check in on dizziness, vision changes, swelling, medication side effects, or anything that felt different today.',
    status: 'upcoming',
    nextDueLabel: 'Tonight',
    channel: 'In-app reminder',
    safety: 'Urgent symptoms should not wait for this log. Sandy should route red flags to human review.',
  },
]

export function alertCounts(alerts: HealthAlert[]): HealthAlertCounts {
  return alerts.reduce<HealthAlertCounts>(
    (counts, alert) => ({
      ...counts,
      [alert.status]: counts[alert.status] + 1,
    }),
    { due: 0, upcoming: 0, completed: 0 },
  )
}

export function markAlertDone(alerts: HealthAlert[], alertId: string): HealthAlert[] {
  return alerts.map((alert) =>
    alert.id === alertId
      ? {
          ...alert,
          status: 'completed',
          nextDueLabel: 'Completed today',
          completedAt: NOW,
        }
      : alert,
  )
}

export function snoozeAlert(alerts: HealthAlert[], alertId: string): HealthAlert[] {
  return alerts.map((alert) =>
    alert.id === alertId
      ? {
          ...alert,
          status: 'upcoming',
          nextDueLabel: 'Snoozed 30 minutes',
          snoozedUntil: SNOOZED_UNTIL,
        }
      : alert,
  )
}
