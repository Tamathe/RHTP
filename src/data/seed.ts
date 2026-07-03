import type {
  Barrier,
  CarePlanTask,
  GapStatus,
  HubMetric,
  NavigatorTask,
  Patient,
  PriorityLabel,
  Referral,
  ScreeningGap,
  ScreeningResult,
  ScreeningSite,
  TimelineEntry,
  OutreachEvent,
} from '../types'

export const HERO_ID = 'pat_ruthann'

export interface SeedState {
  patients: Patient[]
  sites: ScreeningSite[]
  gaps: ScreeningGap[]
  barriers: Barrier[]
  carePlanTasks: CarePlanTask[]
  navigatorTasks: NavigatorTask[]
  results: ScreeningResult[]
  referrals: Referral[]
  outreach: OutreachEvent[]
  timeline: TimelineEntry[]
  metrics: HubMetric[]
}

const counties = ['Perry', 'Leslie', 'Knott', 'Letcher', 'Breathitt', 'Harlan']

const backgroundStatuses: GapStatus[] = [
  'overdue',
  'overdue',
  'engaged',
  'engaged',
  'scheduled',
  'scheduled',
  'completed',
  'closed',
  'closed',
  'closed',
  'referral',
  'repeat',
]

const priorityFor = (status: GapStatus): PriorityLabel => {
  if (status === 'referral' || status === 'repeat') return 'urgent_follow_up'
  if (status === 'engaged') return 'app_engaged'
  return 'likely_barrier'
}

const names = [
  'Dwayne Collins',
  'Marla Baker',
  'Otis Hensley',
  'Junie Sizemore',
  'Bev Fields',
  'Carl Noble',
  'Rae Combs',
  'Lonnie Turner',
  'Faye Gibson',
  'Hoyt Maggard',
  'Della Ison',
  'Wade Profitt',
]

const a1cValues = ['7.1', '9.2', '6.8', '8.0', '7.6', '10.1', '8.9', '7.3', '6.5', '9.8', '8.2', '7.9']

const backgroundPatients: Patient[] = backgroundStatuses.map((_, index) => ({
  id: `pat_bg_${index + 1}`,
  name: names[index],
  county: counties[index % counties.length],
  condition: 'type_2_diabetes',
  a1c: a1cValues[index],
}))

const backgroundGaps: ScreeningGap[] = backgroundStatuses.map((status, index) => ({
  id: `gap_bg_${index + 1}`,
  patientId: `pat_bg_${index + 1}`,
  gapType: 'diabetic_retinopathy',
  status,
  priorityLabel: priorityFor(status),
  lastScreeningDate: '2024-08-01',
}))

const hero: Patient = {
  id: HERO_ID,
  name: 'Ruth Ann Caldwell',
  county: 'Perry',
  condition: 'type_2_diabetes',
  a1c: '8.4',
}

const heroGap: ScreeningGap = {
  id: 'gap_hero',
  patientId: HERO_ID,
  gapType: 'diabetic_retinopathy',
  status: 'overdue',
  priorityLabel: 'likely_barrier',
  lastScreeningDate: '2024-12-10',
}

const sites: ScreeningSite[] = [
  {
    id: 'site_fqhc_mobile',
    name: 'Perry County FQHC Mobile Camera',
    type: 'mobile_clinic',
    distanceMiles: 8,
    nextAvailable: 'Saturday 9:00 AM',
    nextAvailableHours: 30,
    rideSupport: true,
    lowCost: true,
  },
  {
    id: 'site_fqhc',
    name: 'Hazard FQHC Eye Program',
    type: 'fqhc',
    distanceMiles: 15,
    nextAvailable: 'Monday 10:00 AM',
    nextAvailableHours: 60,
    rideSupport: false,
    lowCost: true,
  },
  {
    id: 'site_kroger',
    name: 'Community Camera at Kroger',
    type: 'community_camera',
    distanceMiles: 12,
    nextAvailable: 'Friday 4:00 PM',
    nextAvailableHours: 26,
    rideSupport: false,
    lowCost: true,
  },
  {
    id: 'site_eye',
    name: 'Regional Eye Clinic',
    type: 'eye_clinic',
    distanceMiles: 34,
    nextAvailable: 'Tomorrow 2:00 PM',
    nextAvailableHours: 20,
    rideSupport: false,
    lowCost: false,
  },
]

const metrics: HubMetric[] = [
  {
    id: 'contacted',
    label: 'Overdue patients contacted',
    seed: 9,
    value: 9,
    denominator: 13,
    scope: 'cohort',
  },
  {
    id: 'scheduled',
    label: 'Screenings scheduled',
    seed: 5,
    value: 5,
    denominator: 13,
    scope: 'cohort',
  },
  {
    id: 'completed',
    label: 'Screenings completed',
    seed: 6,
    value: 6,
    denominator: 13,
    scope: 'cohort',
  },
  {
    id: 'gaps_closed',
    label: 'Gaps closed',
    seed: 4,
    value: 4,
    denominator: 13,
    scope: 'cohort',
  },
  {
    id: 'referrals',
    label: 'Referrals completed',
    seed: 1,
    value: 1,
    denominator: 13,
    scope: 'cohort',
  },
  {
    id: 'time_to_treatment',
    label: 'Time to treatment (avg days)',
    seed: 18,
    value: 18,
    denominator: null,
    scope: 'cohort',
  },
]

const referrals: Referral[] = [
  {
    id: 'ref_seed',
    patientId: 'pat_bg_11',
    reason: 'abnormal_result',
    destination: 'Retina specialist, Lexington',
    owner: 'nav_dana',
    status: 'pending',
    daysSinceResult: 5,
  },
]

export const seed: SeedState = {
  patients: [hero, ...backgroundPatients],
  sites,
  gaps: [heroGap, ...backgroundGaps],
  barriers: [],
  carePlanTasks: [],
  navigatorTasks: [],
  results: [],
  referrals,
  outreach: [],
  timeline: [{ id: 'tl_hero_0', patientId: HERO_ID, label: 'Gap identified', seq: 0 }],
  metrics,
}
