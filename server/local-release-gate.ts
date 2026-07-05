export interface LocalReleaseGateCommand {
  id: string
  script: string
  args?: string[]
}

export interface LocalReleaseGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface LocalReleaseGateReport {
  cases: LocalReleaseGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

export type PackageScripts = Record<string, string>

type RuntimeEnv = Partial<Record<'RHTP_REAL_PHI', string>>

export interface LocalReleaseGateInput {
  env?: RuntimeEnv
  packageScripts: PackageScripts
}

const onValues = new Set(['1', 'true', 'yes', 'on'])

export const localReleaseGateCommands: LocalReleaseGateCommand[] = [
  { id: 'ops_status_blockers', script: 'ops:status', args: ['--', '--blockers'] },
  { id: 'safety_gate', script: 'safety:gate' },
  { id: 'identity_gate', script: 'identity:gate' },
  { id: 'async_gate', script: 'async:gate' },
  { id: 'part2_gate', script: 'part2:gate' },
  { id: 'sms_gate', script: 'sms:gate' },
  { id: 'd2_gate', script: 'd2:gate' },
  { id: 'p3_gate', script: 'p3:gate' },
  { id: 'd4_gate', script: 'd4:gate' },
  { id: 'p5_gate', script: 'p5:gate' },
  { id: 'h4_gate', script: 'h4:gate' },
  { id: 'p6_gate', script: 'p6:gate' },
  { id: 'p7_gate', script: 'p7:gate' },
  { id: 'p8_gate', script: 'p8:gate' },
  { id: 'equity_gate', script: 'equity:gate' },
  { id: 'billing_gate', script: 'billing:gate' },
  { id: 'accessibility_gate', script: 'accessibility:gate' },
  { id: 'coverage_gate', script: 'coverage:gate' },
  { id: 'explainer_gate', script: 'explainer:gate' },
  { id: 'enrollment_gate', script: 'enrollment:gate' },
  { id: 'grant_gate', script: 'grant:gate' },
  { id: 'spec_residual_gate', script: 'spec:gate' },
  { id: 'preview_gate', script: 'preview:gate' },
  { id: 'test_suite', script: 'test' },
]

function realPhiIsOff(env: RuntimeEnv): boolean {
  const value = env.RHTP_REAL_PHI
  return value === undefined || !onValues.has(value.toLowerCase())
}

function formatRealPhiFlag(env: RuntimeEnv): string {
  return env.RHTP_REAL_PHI === undefined ? 'RHTP_REAL_PHI=unset' : `RHTP_REAL_PHI=${env.RHTP_REAL_PHI}`
}

export function validateLocalReleaseGate(input: LocalReleaseGateInput): LocalReleaseGateReport {
  const missingScripts = localReleaseGateCommands
    .map((command) => command.script)
    .filter((script) => input.packageScripts[script] === undefined)
  const includesPublicPreviewVerifier = localReleaseGateCommands.some((command) => command.script === 'preview:verify')
  const env = input.env ?? process.env
  const cases: LocalReleaseGateCase[] = [
    {
      id: 'local_release_required_scripts_exist',
      ok: missingScripts.length === 0,
      detail: missingScripts.length === 0 ? 'all required scripts exist' : `missing scripts: ${missingScripts.join(', ')}`,
    },
    {
      id: 'local_release_excludes_public_preview_verifier',
      ok: !includesPublicPreviewVerifier,
      detail: includesPublicPreviewVerifier ? 'preview:verify must run only after public deploy' : 'preview:verify excluded',
    },
    {
      id: 'local_release_real_phi_flag_is_off',
      ok: realPhiIsOff(env),
      detail: formatRealPhiFlag(env),
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
