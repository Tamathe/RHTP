import type { HubMetric } from '../types'

export const incrementMetric = (metrics: HubMetric[], id: string): HubMetric[] =>
  metrics.map((metric) =>
    metric.id === id ? { ...metric, value: metric.value + 1 } : metric,
  )
