import { describe, expect, it } from 'vitest'
import { alertCounts, markAlertDone, seedHealthAlerts, snoozeAlert } from './health-alerts'

describe('health alerts', () => {
  it('seeds medication, blood pressure, and symptom logging alerts', () => {
    expect(seedHealthAlerts.map((alert) => alert.type)).toEqual([
      'medication',
      'blood_pressure',
      'symptom_log',
    ])
    expect(seedHealthAlerts[0]).toEqual(
      expect.objectContaining({
        title: 'Take evening medication',
        status: 'due',
        channel: 'In-app reminder',
      }),
    )
  })

  it('counts due, upcoming, and completed alerts', () => {
    expect(alertCounts(seedHealthAlerts)).toEqual({ due: 2, upcoming: 1, completed: 0 })
  })

  it('marks an alert done without mutating the input list', () => {
    const updated = markAlertDone(seedHealthAlerts, 'alert_med_evening')

    expect(seedHealthAlerts.find((alert) => alert.id === 'alert_med_evening')?.status).toBe('due')
    expect(updated.find((alert) => alert.id === 'alert_med_evening')).toEqual(
      expect.objectContaining({
        status: 'completed',
        completedAt: '2026-07-04T09:00:00',
      }),
    )
    expect(alertCounts(updated)).toEqual({ due: 1, upcoming: 1, completed: 1 })
  })

  it('snoozes a due alert into upcoming state', () => {
    const updated = snoozeAlert(seedHealthAlerts, 'alert_bp_morning')

    expect(updated.find((alert) => alert.id === 'alert_bp_morning')).toEqual(
      expect.objectContaining({
        status: 'upcoming',
        nextDueLabel: 'Snoozed 30 minutes',
        snoozedUntil: '2026-07-04T09:30:00',
      }),
    )
    expect(alertCounts(updated)).toEqual({ due: 1, upcoming: 2, completed: 0 })
  })
})
