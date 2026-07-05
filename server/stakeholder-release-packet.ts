import type { PreviewDeploymentReceipt } from './deploy-receipt'
import { summarizePreviewDeploymentReceipt } from './deploy-receipt-log'

export interface BlockerEntry {
  id: string
  severity: string
  status: string
  appliesTo?: 'demo' | 'real_phi' | 'both'
}

export interface DeployTargetEntry {
  id: string
  status: string
  phi: boolean
}

export interface WorkstreamEntry {
  id: string
  status: string
}

export interface PrototypeScopeEntry {
  patientData: boolean
  allowedData: string[]
  disallowedData: string[]
  healthInfoGatesDeferred: string[]
}

export interface SpecResidualEntry {
  id: string
  source: string
  demoBlocker: boolean
}

export interface ReleaseLedger {
  currentProofRung: string
  prototypeScope?: PrototypeScopeEntry
  blockers: BlockerEntry[]
  deployTargets: DeployTargetEntry[]
  specResiduals?: SpecResidualEntry[]
  workstreams: WorkstreamEntry[]
}

export interface ReleasePacketGitState {
  aheadOfOrigin: number
  branch: string
  commit: string
  dirty: boolean
  shortCommit: string
}

export interface StakeholderReleasePacketInput {
  generatedAt: string
  git: ReleasePacketGitState
  ledger: ReleaseLedger
  publicPreviewReceipt?: PreviewDeploymentReceipt
  publicPreviewReceiptExists: boolean
}

export interface StakeholderReleasePacket {
  appendixBResiduals: {
    crossCuttingProductionSubsystems: number
    demoBlockers: string[]
    mediumControls: number
    namedBriefDemoPaths: number
    rightToErasure: number
  }
  allowedData: string[]
  branch: string
  commit: string
  dirty: boolean
  disallowedData: string[]
  generatedAt: string
  localReleaseVerified: boolean
  openDemoBlockers: string[]
  parkedRealPhiBlockers: string[]
  patientData: boolean
  proofRung: string
  publicPreviewReceiptSummary: string
  publicPreviewStatus: 'missing_receipt' | 'verified'
  pushStatus: 'not_pushed' | 'pushed'
  realPhiPilotStatus: 'not_in_prototype' | 'blocked' | 'unknown'
  requiredCommands: string[]
  shortCommit: string
  unpushedCommitCount: number
}

const namedBriefDemoWorkstreamIds = [
  'coverage_logistics_demo_gate',
  'discharge_explainer_demo_gate',
  'billing_artifact_demo_gate',
  'grant_reporting_demo_gate',
  'navigator_enrollment_demo_gate',
]

function openBlockers(ledger: ReleaseLedger): BlockerEntry[] {
  return ledger.blockers.filter((blocker) => blocker.status !== 'closed')
}

function openDemoBlockers(ledger: ReleaseLedger): string[] {
  return openBlockers(ledger)
    .filter((blocker) => blocker.appliesTo === 'demo' || blocker.appliesTo === 'both')
    .map((blocker) => blocker.id)
}

function parkedRealPhiBlockers(ledger: ReleaseLedger): string[] {
  return openBlockers(ledger)
    .filter((blocker) => blocker.appliesTo === 'real_phi')
    .filter((blocker) => blocker.severity === 'existential' || blocker.severity === 'high')
    .map((blocker) => blocker.id)
}

function realPhiPilotStatus(ledger: ReleaseLedger): 'not_in_prototype' | 'blocked' | 'unknown' {
  const target = ledger.deployTargets.find((deployTarget) => deployTarget.id === 'real_phi_pilot')
  if (target?.status === 'not_in_prototype') return 'not_in_prototype'
  return target?.status === 'blocked' ? 'blocked' : 'unknown'
}

function publicPreviewReceiptSummary(input: StakeholderReleasePacketInput): string {
  if (input.publicPreviewReceipt) return summarizePreviewDeploymentReceipt(input.publicPreviewReceipt)
  return input.publicPreviewReceiptExists ? 'recorded' : 'missing'
}

function appendixBResiduals(ledger: ReleaseLedger): StakeholderReleasePacket['appendixBResiduals'] {
  const residuals = ledger.specResiduals ?? []

  return {
    crossCuttingProductionSubsystems: residuals.filter((residual) => residual.source === 'Appendix B.4').length,
    demoBlockers: residuals.filter((residual) => residual.demoBlocker).map((residual) => residual.id),
    mediumControls: residuals.filter((residual) => residual.source === 'Appendix B.3').length,
    namedBriefDemoPaths: ledger.workstreams.filter((workstream) =>
      namedBriefDemoWorkstreamIds.includes(workstream.id) && workstream.status.includes('local_demo_verified'),
    ).length,
    rightToErasure: residuals.filter((residual) => residual.source === 'Appendix B.6').length,
  }
}

export function createStakeholderReleasePacket(input: StakeholderReleasePacketInput): StakeholderReleasePacket {
  const prototypeScope = input.ledger.prototypeScope
  const previewReceiptRecorded = input.publicPreviewReceipt !== undefined || input.publicPreviewReceiptExists

  return {
    appendixBResiduals: appendixBResiduals(input.ledger),
    allowedData: prototypeScope?.allowedData ?? [],
    branch: input.git.branch,
    commit: input.git.commit,
    dirty: input.git.dirty,
    disallowedData: prototypeScope?.disallowedData ?? [],
    generatedAt: input.generatedAt,
    localReleaseVerified: input.ledger.currentProofRung === 'local_release_gate_verified_no_real_phi',
    openDemoBlockers: openDemoBlockers(input.ledger),
    parkedRealPhiBlockers: parkedRealPhiBlockers(input.ledger),
    patientData: prototypeScope?.patientData ?? true,
    proofRung: input.ledger.currentProofRung,
    publicPreviewReceiptSummary: publicPreviewReceiptSummary(input),
    publicPreviewStatus: previewReceiptRecorded ? 'verified' : 'missing_receipt',
    pushStatus: input.git.aheadOfOrigin > 0 ? 'not_pushed' : 'pushed',
    realPhiPilotStatus: realPhiPilotStatus(input.ledger),
    requiredCommands: [
      'npm run release:gate',
      'git push origin master',
      '$env:RHTP_PREVIEW_URL = "https://..."',
      '$env:RHTP_DEPLOYMENT_ID = "dpl_..."',
      '$env:RHTP_RECORD_PREVIEW_RECEIPT = "1"',
      'npm run preview:verify',
    ],
    shortCommit: input.git.shortCommit,
    unpushedCommitCount: input.git.aheadOfOrigin,
  }
}

function listOrNone(items: string[]): string {
  return items.length === 0 ? 'none' : items.join(', ')
}

function codeFence(lines: string[]): string {
  return ['```powershell', ...lines, '```'].join('\n')
}

function formatRealPhiPilotStatus(status: StakeholderReleasePacket['realPhiPilotStatus']): string {
  if (status === 'not_in_prototype') return 'not in prototype scope'
  return status
}

export function renderStakeholderReleasePacketMarkdown(packet: StakeholderReleasePacket): string {
  const lines = [
    '# RHTP Stakeholder Demo Release Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    '',
    '## Current Rung',
    '',
    `- Proof rung: \`${packet.proofRung}\``,
    `- Local release gate verified: \`${packet.localReleaseVerified}\``,
    `- Patient data: \`${packet.patientData}\``,
    `- Working tree dirty: \`${packet.dirty}\``,
    `- Branch: \`${packet.branch}\``,
    `- Commit: \`${packet.shortCommit}\``,
    `- Push status: ${packet.pushStatus === 'not_pushed' ? `not pushed (\`${packet.unpushedCommitCount}\` local commits ahead of origin)` : 'pushed'}`,
    `- Public preview receipt: ${packet.publicPreviewReceiptSummary}`,
    `- Real-PHI pilot: ${formatRealPhiPilotStatus(packet.realPhiPilotStatus)}`,
    '',
    '## Demo Scope',
    '',
    `- Allowed data: ${listOrNone(packet.allowedData)}`,
    `- Disallowed data: ${listOrNone(packet.disallowedData)}`,
    `- Open demo blockers: ${listOrNone(packet.openDemoBlockers)}`,
    `- Prototype-deferred health-information gates: ${listOrNone(packet.parkedRealPhiBlockers)}`,
    '',
    '## Appendix B Residuals',
    '',
    `- Medium controls tracked: \`${packet.appendixBResiduals.mediumControls}\``,
    `- Cross-cutting production subsystems tracked: \`${packet.appendixBResiduals.crossCuttingProductionSubsystems}\``,
    `- Named brief demo paths verified: \`${packet.appendixBResiduals.namedBriefDemoPaths}\``,
    `- Right-to-erasure tracked: \`${packet.appendixBResiduals.rightToErasure}\``,
    `- Residual demo blockers: ${listOrNone(packet.appendixBResiduals.demoBlockers)}`,
    '',
    '## Next Commands',
    '',
    codeFence(packet.requiredCommands),
    '',
    '## Proof Boundary',
    '',
    'This packet does not prove public deployment, live alias routing, or real-PHI readiness.',
  ]

  return `${lines.join('\n')}\n`
}
