import releaseLedger from '../docs/ops/rhtp-release-ledger.json'

export interface StakeholderDemoGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface StakeholderDemoGateReport {
  cases: StakeholderDemoGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

interface PhaseEntry {
  id: string
  status: string
  blockers: string[]
  demoBlockers?: string[]
  realPhiBlockers?: string[]
}

interface BlockerEntry {
  id: string
  severity: string
  status: string
  appliesTo?: 'demo' | 'real_phi' | 'both'
}

interface DeployTargetEntry {
  id: string
  status: string
  phi: boolean
  proofRequired: string[]
}

interface ReleaseLedger {
  currentProofRung: string
  phases: PhaseEntry[]
  blockers: BlockerEntry[]
  deployTargets: DeployTargetEntry[]
}

type RuntimeEnv = Partial<Record<'RHTP_REAL_PHI', string>>

const ledger = releaseLedger as ReleaseLedger
const onValues = new Set(['1', 'true', 'yes', 'on'])

function phaseDemoBlockers(phase: PhaseEntry): string[] {
  if (phase.demoBlockers) return phase.demoBlockers
  return phase.status.includes('real_phi_blocked') ? [] : phase.blockers
}

function realPhiIsOff(env: RuntimeEnv): boolean {
  const value = env.RHTP_REAL_PHI
  return value === undefined || !onValues.has(value.toLowerCase())
}

function formatRealPhiFlag(env: RuntimeEnv): string {
  return env.RHTP_REAL_PHI === undefined ? 'RHTP_REAL_PHI=unset' : `RHTP_REAL_PHI=${env.RHTP_REAL_PHI}`
}

function openHealthInfoBlockers(): BlockerEntry[] {
  return ledger.blockers.filter(
    (blocker) => blocker.status !== 'closed' && (blocker.severity === 'existential' || blocker.severity === 'high'),
  )
}

export function runStakeholderDemoGate(env: RuntimeEnv = process.env): StakeholderDemoGateReport {
  const demoBlockers = ledger.phases.flatMap((phase) =>
    phaseDemoBlockers(phase).map((blocker) => `${phase.id}:${blocker}`),
  )
  const stakeholderTarget = ledger.deployTargets.find((target) => target.id === 'stakeholder_demo')
  const phasesWithDemoLeak = ledger.phases
    .filter((phase) => phase.status.includes('demo_ready'))
    .filter((phase) => phaseDemoBlockers(phase).length > 0)
    .map((phase) => phase.id)
  const unscopedHealthInfoBlockers = openHealthInfoBlockers()
    .filter((blocker) => blocker.appliesTo !== 'real_phi')
    .map((blocker) => blocker.id)

  const cases: StakeholderDemoGateCase[] = [
    {
      id: 'stakeholder_demo_has_no_demo_blockers',
      ok: demoBlockers.length === 0,
      detail: demoBlockers.length === 0 ? 'no open demo blockers' : demoBlockers.join(','),
    },
    {
      id: 'stakeholder_demo_real_phi_flag_is_off',
      ok: realPhiIsOff(env),
      detail: formatRealPhiFlag(env),
    },
    {
      id: 'stakeholder_demo_target_is_no_phi',
      ok:
        stakeholderTarget?.phi === false &&
        stakeholderTarget.status.includes('ready') &&
        stakeholderTarget.proofRequired.includes('synthetic seed data only') &&
        stakeholderTarget.proofRequired.includes('RHTP_REAL_PHI remains off'),
      detail: stakeholderTarget
        ? `${stakeholderTarget.status}; phi=${stakeholderTarget.phi}`
        : 'stakeholder_demo target missing',
    },
    {
      id: 'stakeholder_demo_phases_allow_only_real_phi_blockers',
      ok: phasesWithDemoLeak.length === 0,
      detail: phasesWithDemoLeak.length === 0 ? 'demo-ready phases have no demo blockers' : phasesWithDemoLeak.join(','),
    },
    {
      id: 'stakeholder_demo_health_info_gates_are_real_phi_only',
      ok: unscopedHealthInfoBlockers.length === 0,
      detail:
        unscopedHealthInfoBlockers.length === 0
          ? 'open E/H gates are real-PHI only'
          : unscopedHealthInfoBlockers.join(','),
    },
  ]
  const passed = cases.filter((testCase) => testCase.ok).length

  return {
    cases,
    summary: {
      ok: passed === cases.length,
      passed,
      total: cases.length,
    },
  }
}
