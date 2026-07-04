import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface PhaseEntry {
  id: string
  name: string
  status: string
  proof: string[]
  blockers: string[]
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
  phases: PhaseEntry[]
  workstreams: WorkstreamEntry[]
  blockers: BlockerEntry[]
  featureFlags: FeatureFlagEntry[]
  deployTargets: DeployTargetEntry[]
  decisions: DecisionEntry[]
  nextActions: string[]
}

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ledgerPath = resolve(rootDir, 'docs/ops/rhtp-release-ledger.json')
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8')) as ReleaseLedger
const args = new Set(process.argv.slice(2))

function line(title: string): void {
  console.log(`\n${title}`)
  console.log('-'.repeat(title.length))
}

function joinList(items: string[]): string {
  return items.length === 0 ? 'none' : items.join(', ')
}

function printOverview(): void {
  console.log(`RHTP release ledger v${ledger.version}`)
  console.log(`Updated: ${ledger.updatedAt}`)
  console.log(`Source spec: ${ledger.sourceSpec}`)
  console.log(`Current proof rung: ${ledger.currentProofRung}`)
  console.log(`Summary: ${ledger.summary}`)
}

function printPhases(): void {
  line('Phases')
  for (const phase of ledger.phases) {
    console.log(`${phase.id} ${phase.name}: ${phase.status} | blockers: ${joinList(phase.blockers)}`)
  }
}

function printWorkstreams(): void {
  line('Workstreams')
  for (const workstream of ledger.workstreams) {
    console.log(`${workstream.name}: ${workstream.status} (${workstream.phase})`)
  }
}

function printBlockers(): void {
  line('Open blockers')
  const openBlockers = ledger.blockers.filter((blocker) => blocker.status !== 'closed')
  for (const blocker of openBlockers) {
    console.log(`${blocker.id} [${blocker.severity}] ${blocker.title}`)
    console.log(`  Gate: ${blocker.phaseGate}`)
    console.log(`  Control: ${blocker.requiredControl}`)
  }
}

function printFlags(): void {
  line('Feature flags')
  for (const flag of ledger.featureFlags) {
    console.log(`${flag.key}: ${flag.status} | current=${flag.currentValue} | default=${flag.defaultValue} | ${flag.exposure} | ${flag.phase}`)
    console.log(`  Flip condition: ${flag.flipCondition}`)
  }
}

function printDeployTargets(): void {
  line('Deploy targets')
  for (const target of ledger.deployTargets) {
    const phi = target.phi ? 'real-PHI' : 'no-PHI'
    console.log(`${target.name}: ${target.status} | ${phi} | command: ${target.command}`)
    console.log(`  Proof required: ${joinList(target.proofRequired)}`)
  }
}

function printDecisions(): void {
  line('Open decisions')
  const openDecisions = ledger.decisions.filter((decision) => decision.status !== 'closed')
  for (const decision of openDecisions) {
    console.log(`${decision.id}: ${decision.title} | gate=${decision.phaseGate} | default=${decision.default}`)
  }
}

function printNextActions(): void {
  line('Next actions')
  ledger.nextActions.forEach((action, index) => {
    console.log(`${index + 1}. ${action}`)
  })
}

if (args.has('--json')) {
  console.log(JSON.stringify(ledger, null, 2))
} else if (args.has('--blockers')) {
  printOverview()
  printBlockers()
} else if (args.has('--flags')) {
  printOverview()
  printFlags()
} else {
  printOverview()
  printPhases()
  printWorkstreams()
  printBlockers()
  printFlags()
  printDeployTargets()
  printDecisions()
  printNextActions()
}
