import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface PhaseEntry {
  id: string
  name: string
  status: string
  proof: string[]
  blockers: string[]
  demoBlockers?: string[]
  realPhiBlockers?: string[]
}

interface WorkstreamEntry {
  id: string
  name: string
  status: string
  phase: string
  proof: string[]
  notes: string
}

interface BlockerEntry {
  id: string
  severity: string
  title: string
  phaseGate: string
  status: string
  requiredControl: string
  source: string
  appliesTo?: 'demo' | 'real_phi' | 'both'
}

interface FeatureFlagEntry {
  key: string
  phase: string
  exposure: string
  defaultValue: string
  currentValue: string
  status: string
  flipCondition: string
}

interface DeployTargetEntry {
  id: string
  name: string
  status: string
  phi: boolean
  command: string
  proofRequired: string[]
}

interface PrototypeScopeEntry {
  id: string
  name: string
  patientData: boolean
  allowedData: string[]
  disallowedData: string[]
  realPhiFlag: string
  healthInfoGatesDeferred: string[]
  deferUntil: string
  statement: string
}

interface DecisionEntry {
  id: string
  title: string
  default: string
  phaseGate: string
  status: string
}

interface ReleaseLedger {
  version: number
  updatedAt: string
  sourceSpec: string
  currentProofRung: string
  summary: string
  prototypeScope?: PrototypeScopeEntry
  phases: PhaseEntry[]
  workstreams: WorkstreamEntry[]
  blockers: BlockerEntry[]
  featureFlags: FeatureFlagEntry[]
  deployTargets: DeployTargetEntry[]
  decisions: DecisionEntry[]
  nextActions: string[]
}

interface StatusRenderOptions {
  previewReceiptExists?: boolean
}

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ledgerPath = resolve(rootDir, 'docs/ops/rhtp-release-ledger.json')
const previewReceiptPath = resolve(rootDir, 'docs/ops/RHTP-DEPLOY-RECEIPTS.jsonl')
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) as ReleaseLedger

function line(output: string[], title: string): void {
  output.push(`\n${title}`)
  output.push('-'.repeat(title.length))
}

function joinList(items: string[]): string {
  return items.length === 0 ? 'none' : items.join(', ')
}

function phaseRealPhiBlockers(phase: PhaseEntry): string[] {
  if (phase.realPhiBlockers) return phase.realPhiBlockers
  return phase.status.includes('real_phi_blocked') ? phase.blockers : []
}

function phaseDemoBlockers(phase: PhaseEntry): string[] {
  if (phase.demoBlockers) return phase.demoBlockers
  return phase.status.includes('real_phi_blocked') ? [] : phase.blockers
}

function appliesToRealPhi(blocker: BlockerEntry): boolean {
  return blocker.appliesTo === undefined || blocker.appliesTo === 'real_phi' || blocker.appliesTo === 'both'
}

function appliesToDemo(blocker: BlockerEntry): boolean {
  return blocker.appliesTo === 'demo' || blocker.appliesTo === 'both'
}

function printOverview(output: string[]): void {
  output.push(`RHTP release ledger v${ledger.version}`)
  output.push(`Updated: ${ledger.updatedAt}`)
  output.push(`Source spec: ${ledger.sourceSpec}`)
  output.push(`Current proof rung: ${ledger.currentProofRung}`)
  output.push(`Summary: ${ledger.summary}`)
}

function printPrototypeScope(output: string[]): void {
  const scope = ledger.prototypeScope
  if (scope === undefined) return

  line(output, 'Prototype scope')
  output.push(`${scope.name}: ${scope.statement}`)
  output.push(`Patient data: ${scope.patientData}`)
  output.push(`Allowed data: ${joinList(scope.allowedData)}`)
  output.push(`Disallowed data: ${joinList(scope.disallowedData)}`)
  output.push(`Required flag posture: ${scope.realPhiFlag}=off`)
  output.push(`Health-info gates deferred for stakeholder demo: ${joinList(scope.healthInfoGatesDeferred)}`)
}

function printPhases(output: string[]): void {
  line(output, 'Phases')
  for (const phase of ledger.phases) {
    output.push(
      `${phase.id} ${phase.name}: ${phase.status} | demo blockers: ${joinList(
        phaseDemoBlockers(phase),
      )} | real-PHI blockers: ${joinList(phaseRealPhiBlockers(phase))}`,
    )
  }
}

function printWorkstreams(output: string[]): void {
  line(output, 'Workstreams')
  for (const workstream of ledger.workstreams) {
    output.push(`${workstream.name}: ${workstream.status} (${workstream.phase})`)
  }
}

function printBlockers(output: string[]): void {
  const openBlockers = ledger.blockers.filter((blocker) => blocker.status !== 'closed')
  const realPhiBlockers = openBlockers.filter(appliesToRealPhi)
  const demoBlockers = openBlockers.filter(appliesToDemo)

  line(output, 'Parked real-PHI blockers (not demo blockers)')
  for (const blocker of realPhiBlockers) {
    output.push(`${blocker.id} [${blocker.severity}] ${blocker.title}`)
    output.push(`  Gate: ${blocker.phaseGate}`)
    output.push(`  Control: ${blocker.requiredControl}`)
  }

  line(output, 'Open demo blockers')
  if (demoBlockers.length === 0) {
    output.push('No open demo blockers.')
    return
  }

  for (const blocker of demoBlockers) {
    output.push(`${blocker.id} [${blocker.severity}] ${blocker.title}`)
    output.push(`  Gate: ${blocker.phaseGate}`)
    output.push(`  Control: ${blocker.requiredControl}`)
  }
}

function printFlags(output: string[]): void {
  line(output, 'Feature flags')
  for (const flag of ledger.featureFlags) {
    output.push(`${flag.key}: ${flag.status} | current=${flag.currentValue} | default=${flag.defaultValue} | ${flag.exposure} | ${flag.phase}`)
    output.push(`  Flip condition: ${flag.flipCondition}`)
  }
}

function printDeployTargets(output: string[]): void {
  line(output, 'Deploy targets')
  for (const target of ledger.deployTargets) {
    const phi = target.phi ? 'real-PHI' : 'no-PHI'
    output.push(`${target.name}: ${target.status} | ${phi} | command: ${target.command}`)
    output.push(`  Proof required: ${joinList(target.proofRequired)}`)
  }
}

function printDeployStatus(output: string[], options: StatusRenderOptions): void {
  const previewReceiptExists = options.previewReceiptExists ?? existsSync(previewReceiptPath)
  output.push('RHTP deploy status')
  output.push(`Updated: ${ledger.updatedAt}`)
  output.push(`Current proof rung: ${ledger.currentProofRung}`)
  printPrototypeScope(output)
  printDeployTargets(output)
  output.push(`Public preview receipt: ${previewReceiptExists ? 'recorded' : 'missing'}`)
  line(output, 'Next deploy actions')
  output.push('1. npm run release:gate')
  output.push('2. npm run release:packet')
  output.push('3. Push/deploy only when explicitly requested.')
  output.push('4. RHTP_PREVIEW_URL + RHTP_DEPLOYMENT_ID + RHTP_RECORD_PREVIEW_RECEIPT=1 npm run preview:verify')
}

function printDecisions(output: string[]): void {
  line(output, 'Open decisions')
  const openDecisions = ledger.decisions.filter((decision) => decision.status !== 'closed')
  for (const decision of openDecisions) {
    output.push(`${decision.id}: ${decision.title} | gate=${decision.phaseGate} | default=${decision.default}`)
  }
}

function printNextActions(output: string[]): void {
  line(output, 'Next actions')
  ledger.nextActions.forEach((action, index) => {
    output.push(`${index + 1}. ${action}`)
  })
}

export function renderStatus(argList: string[] = [], options: StatusRenderOptions = {}): string {
  const args = new Set(argList)
  const output: string[] = []

  if (args.has('--json')) {
    output.push(JSON.stringify(ledger, null, 2))
  } else if (args.has('--deploy')) {
    printDeployStatus(output, options)
  } else if (args.has('--blockers')) {
    printOverview(output)
    printPrototypeScope(output)
    printBlockers(output)
  } else if (args.has('--flags')) {
    printOverview(output)
    printPrototypeScope(output)
    printFlags(output)
  } else {
    printOverview(output)
    printPrototypeScope(output)
    printPhases(output)
    printWorkstreams(output)
    printBlockers(output)
    printFlags(output)
    printDeployTargets(output)
    printDecisions(output)
    printNextActions(output)
  }

  return `${output.join('\n')}\n`
}

const isCliRun = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCliRun) {
  process.stdout.write(renderStatus(process.argv.slice(2)))
}
