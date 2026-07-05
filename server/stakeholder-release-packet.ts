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

export interface PrototypeScopeEntry {
  patientData: boolean
  allowedData: string[]
  disallowedData: string[]
  healthInfoGatesDeferred: string[]
}

export interface ReleaseLedger {
  currentProofRung: string
  prototypeScope?: PrototypeScopeEntry
  blockers: BlockerEntry[]
  deployTargets: DeployTargetEntry[]
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

export function createStakeholderReleasePacket(input: StakeholderReleasePacketInput): StakeholderReleasePacket {
  const prototypeScope = input.ledger.prototypeScope
  const previewReceiptRecorded = input.publicPreviewReceipt !== undefined || input.publicPreviewReceiptExists

  return {
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
