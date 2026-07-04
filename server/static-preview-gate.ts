import { runStakeholderDemoGate, type StakeholderDemoGateCase } from './stakeholder-demo-gate'

export interface StaticPreviewGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface StaticPreviewGateReport {
  cases: StaticPreviewGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

interface VercelRewrite {
  source?: string
  destination?: string
}

interface VercelConfig {
  rewrites?: VercelRewrite[]
}

interface RuntimeEnv {
  RHTP_REAL_PHI?: string
}

export interface StaticPreviewGateInput {
  env?: RuntimeEnv
  responseBody: string
  responseStatus: number
  vercelConfig: VercelConfig
}

const onValues = new Set(['1', 'true', 'yes', 'on'])

function realPhiIsOff(env: RuntimeEnv): boolean {
  const value = env.RHTP_REAL_PHI
  return value === undefined || !onValues.has(value.toLowerCase())
}

function formatRealPhiFlag(env: RuntimeEnv): string {
  return env.RHTP_REAL_PHI === undefined ? 'RHTP_REAL_PHI=unset' : `RHTP_REAL_PHI=${env.RHTP_REAL_PHI}`
}

function hasViteAppShell(responseBody: string): boolean {
  return (
    responseBody.includes('id="root"') &&
    responseBody.includes('type="module"') &&
    responseBody.includes('/assets/')
  )
}

function hasSpaRewrite(vercelConfig: VercelConfig): boolean {
  return (
    vercelConfig.rewrites?.some(
      (rewrite) => rewrite.source === '/(.*)' && rewrite.destination === '/index.html',
    ) === true
  )
}

function demoBlockerCase(stakeholderCases: StakeholderDemoGateCase[]): StaticPreviewGateCase {
  const sourceCase = stakeholderCases.find((testCase) => testCase.id === 'stakeholder_demo_has_no_demo_blockers')

  return {
    id: 'static_preview_has_no_demo_blockers',
    ok: sourceCase?.ok === true,
    detail: sourceCase?.detail ?? 'stakeholder demo gate case missing',
  }
}

export function runStaticPreviewGate(input: StaticPreviewGateInput): StaticPreviewGateReport {
  const env = input.env ?? process.env
  const stakeholderDemo = runStakeholderDemoGate(env)
  const cases: StaticPreviewGateCase[] = [
    {
      id: 'static_preview_http_200',
      ok: input.responseStatus === 200,
      detail: `status=${input.responseStatus}`,
    },
    {
      id: 'static_preview_serves_vite_app_shell',
      ok: hasViteAppShell(input.responseBody),
      detail: hasViteAppShell(input.responseBody) ? 'root and module assets present' : 'app shell markers missing',
    },
    {
      id: 'static_preview_spa_rewrite_configured',
      ok: hasSpaRewrite(input.vercelConfig),
      detail: hasSpaRewrite(input.vercelConfig) ? '/(.*) -> /index.html' : 'missing /(.*) -> /index.html rewrite',
    },
    {
      id: 'static_preview_real_phi_flag_is_off',
      ok: realPhiIsOff(env),
      detail: formatRealPhiFlag(env),
    },
    demoBlockerCase(stakeholderDemo.cases),
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
