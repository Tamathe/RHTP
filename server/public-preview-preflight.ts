export interface PublicPreviewPreflightGitState {
  aheadOfOrigin: number
  branch: string
  dirty: boolean
  hasUpstream: boolean
}

export interface PublicPreviewPreflightLedger {
  currentProofRung: string
}

export interface PublicPreviewPreflightCase {
  id: string
  ok: boolean
  detail: string
}

export interface PublicPreviewPreflightReport {
  cases: PublicPreviewPreflightCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

type RuntimeEnv = Partial<Record<'RHTP_REAL_PHI', string>>

export interface PublicPreviewPreflightInput {
  env?: RuntimeEnv
  git: PublicPreviewPreflightGitState
  ledger: PublicPreviewPreflightLedger
  vercelProjectLinked: boolean
}

const onValues = new Set(['1', 'true', 'yes', 'on'])

function realPhiIsOff(env: RuntimeEnv): boolean {
  const value = env.RHTP_REAL_PHI
  return value === undefined || !onValues.has(value.toLowerCase())
}

function formatRealPhiFlag(env: RuntimeEnv): string {
  return env.RHTP_REAL_PHI === undefined ? 'RHTP_REAL_PHI=unset' : `RHTP_REAL_PHI=${env.RHTP_REAL_PHI}`
}

export function runPublicPreviewPreflight(input: PublicPreviewPreflightInput): PublicPreviewPreflightReport {
  const env = input.env ?? process.env
  const cases: PublicPreviewPreflightCase[] = [
    {
      id: 'preview_preflight_local_release_verified',
      ok: input.ledger.currentProofRung === 'local_release_gate_verified_no_real_phi',
      detail: input.ledger.currentProofRung,
    },
    {
      id: 'preview_preflight_real_phi_flag_is_off',
      ok: realPhiIsOff(env),
      detail: formatRealPhiFlag(env),
    },
    {
      id: 'preview_preflight_working_tree_clean',
      ok: !input.git.dirty,
      detail: input.git.dirty ? 'working tree dirty' : 'working tree clean',
    },
    {
      id: 'preview_preflight_branch_has_upstream',
      ok: input.git.hasUpstream,
      detail: input.git.hasUpstream ? `${input.git.branch} has upstream` : `${input.git.branch} has no upstream`,
    },
    {
      id: 'preview_preflight_local_commits_pushed',
      ok: input.git.hasUpstream && input.git.aheadOfOrigin === 0,
      detail:
        input.git.aheadOfOrigin === 0
          ? 'no local commits ahead of origin'
          : `${input.git.aheadOfOrigin} commits ahead of origin`,
    },
    {
      id: 'preview_preflight_vercel_project_linked',
      ok: input.vercelProjectLinked,
      detail: input.vercelProjectLinked ? '.vercel/project.json present' : '.vercel/project.json missing',
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
