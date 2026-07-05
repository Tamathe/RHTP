import { runStakeholderDemoGate, type StakeholderDemoGateCase } from './stakeholder-demo-gate'

export interface PublicPreviewGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface PublicPreviewGateReport {
  cases: PublicPreviewGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

interface RuntimeEnv {
  RHTP_REAL_PHI?: string
}

export interface PublicPreviewGateInput {
  deploymentId: string
  deploymentUrl: string
  env?: RuntimeEnv
  responseBody: string
  responseStatus: number
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

function hasHttpsUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).protocol === 'https:'
  } catch {
    return false
  }
}

function hasVercelDeploymentId(deploymentId: string): boolean {
  return deploymentId.trim().startsWith('dpl_')
}

function demoBlockerCase(stakeholderCases: StakeholderDemoGateCase[]): PublicPreviewGateCase {
  const sourceCase = stakeholderCases.find((testCase) => testCase.id === 'stakeholder_demo_has_no_demo_blockers')

  return {
    id: 'public_preview_has_no_demo_blockers',
    ok: sourceCase?.ok === true,
    detail: sourceCase?.detail ?? 'stakeholder demo gate case missing',
  }
}

export function runPublicPreviewGate(input: PublicPreviewGateInput): PublicPreviewGateReport {
  const env = input.env ?? process.env
  const stakeholderDemo = runStakeholderDemoGate(env)
  const deploymentId = input.deploymentId.trim()
  const cases: PublicPreviewGateCase[] = [
    {
      id: 'public_preview_has_https_url',
      ok: hasHttpsUrl(input.deploymentUrl),
      detail: input.deploymentUrl,
    },
    {
      id: 'public_preview_has_vercel_deployment_id',
      ok: hasVercelDeploymentId(deploymentId),
      detail: deploymentId.length === 0 ? 'deployment id missing' : deploymentId,
    },
    {
      id: 'public_preview_http_200',
      ok: input.responseStatus === 200,
      detail: `status=${input.responseStatus}`,
    },
    {
      id: 'public_preview_serves_vite_app_shell',
      ok: hasViteAppShell(input.responseBody),
      detail: hasViteAppShell(input.responseBody) ? 'root and module assets present' : 'app shell markers missing',
    },
    {
      id: 'public_preview_real_phi_flag_is_off',
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
