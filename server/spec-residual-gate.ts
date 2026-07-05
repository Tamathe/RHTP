import releaseLedger from '../docs/ops/rhtp-release-ledger.json'

export interface SpecResidualGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface SpecResidualGateReport {
  cases: SpecResidualGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

interface WorkstreamEntry {
  id: string
  status: string
  proof: string[]
}

interface PhaseEntry {
  status: string
  blockers: string[]
  demoBlockers?: string[]
}

interface PrototypeScope {
  patientData: boolean
}

interface SpecResidualEntry {
  id: string
  source: string
  status: string
  appliesTo: 'stakeholder_demo' | 'real_phi' | 'production'
  demoBlocker: boolean
  proof: string[]
}

interface ReleaseLedger {
  prototypeScope?: PrototypeScope
  phases: PhaseEntry[]
  workstreams: WorkstreamEntry[]
  specResiduals?: SpecResidualEntry[]
}

const ledger = releaseLedger as ReleaseLedger

const requiredB3ResidualIds = [
  'B3_IDEMPOTENCY_PACK_VERSION',
  'B3_INSIGHT_RETRACTION_RECONCILIATION',
  'B3_LANGUAGE_COMPLETE_COPY_LINT',
  'B3_STALE_FACT_REVERIFICATION',
  'B3_THRESHOLD_REGATE',
]

const requiredB4ResidualIds = [
  'B4_OPERATIONS_OBSERVABILITY_RELIABILITY',
  'B4_PATIENT_PROGRAM_LIFECYCLE',
  'B4_LOCALIZATION_TRANSLATION_PIPELINE',
  'B4_ACCESSIBILITY_WCAG',
  'B4_FINOPS_COST_MODEL',
  'B4_VENDOR_RISK_MODEL_ABSTRACTION',
  'B4_DEPLOYMENT_SUBSTRATE',
  'B4_SMS_TELEPHONY_OPERATIONS',
]

const requiredB5WorkstreamIds = [
  'coverage_logistics_demo_gate',
  'discharge_explainer_demo_gate',
  'billing_artifact_demo_gate',
  'grant_reporting_demo_gate',
  'navigator_enrollment_demo_gate',
]

const requiredB6ResidualIds = ['B6_RIGHT_TO_ERASURE_APPEND_ONLY_LOG']

function residualsFor(source: string): SpecResidualEntry[] {
  return (ledger.specResiduals ?? []).filter((residual) => residual.source === source)
}

function trackedResidualCase(id: string, source: string, requiredIds: string[]): SpecResidualGateCase {
  const residuals = residualsFor(source)
  const presentIds = residuals.map((residual) => residual.id)
  const missing = requiredIds.filter((requiredId) => !presentIds.includes(requiredId))
  const incomplete = residuals
    .filter((residual) => requiredIds.includes(residual.id))
    .filter((residual) => residual.proof.length === 0 || residual.demoBlocker)
    .map((residual) => residual.id)

  return {
    id,
    ok: missing.length === 0 && incomplete.length === 0,
    detail:
      missing.length === 0 && incomplete.length === 0
        ? `tracked=${requiredIds.length}/${requiredIds.length}`
        : `missing=${missing.join(',') || 'none'}; incomplete=${incomplete.join(',') || 'none'}`,
  }
}

function appendixB5NamedCapabilitiesHaveDemoPaths(): SpecResidualGateCase {
  const missing = requiredB5WorkstreamIds.filter((id) => ledger.workstreams.every((workstream) => workstream.id !== id))
  const incomplete = ledger.workstreams
    .filter((workstream) => requiredB5WorkstreamIds.includes(workstream.id))
    .filter(
      (workstream) =>
        !workstream.status.includes('local_demo_verified') ||
        !workstream.proof.some((proof) => proof.startsWith('npm run ')),
    )
    .map((workstream) => workstream.id)

  return {
    id: 'appendix_b5_named_capabilities_have_demo_paths',
    ok: missing.length === 0 && incomplete.length === 0,
    detail:
      missing.length === 0 && incomplete.length === 0
        ? `demoPaths=${requiredB5WorkstreamIds.length}/${requiredB5WorkstreamIds.length}`
        : `missing=${missing.join(',') || 'none'}; incomplete=${incomplete.join(',') || 'none'}`,
  }
}

function productionResidualsAreNotDemoBlockers(): SpecResidualGateCase {
  const demoPhaseBlockers = ledger.phases.flatMap((phase) => phase.demoBlockers ?? phase.blockers)
  const leakingResiduals = (ledger.specResiduals ?? [])
    .filter((residual) => residual.appliesTo !== 'stakeholder_demo')
    .filter((residual) => residual.demoBlocker || demoPhaseBlockers.includes(residual.id))
    .map((residual) => residual.id)
  const patientData = ledger.prototypeScope?.patientData

  return {
    id: 'production_residuals_are_not_demo_blockers',
    ok: patientData === false && leakingResiduals.length === 0,
    detail:
      patientData === false && leakingResiduals.length === 0
        ? 'prototype patientData=false; production residuals not demo blockers'
        : `patientData=${patientData}; leaking=${leakingResiduals.join(',') || 'none'}`,
  }
}

export function runSpecResidualGate(): SpecResidualGateReport {
  const cases: SpecResidualGateCase[] = [
    trackedResidualCase('appendix_b3_medium_residuals_tracked', 'Appendix B.3', requiredB3ResidualIds),
    trackedResidualCase('appendix_b4_cross_cutting_subsystems_tracked', 'Appendix B.4', requiredB4ResidualIds),
    appendixB5NamedCapabilitiesHaveDemoPaths(),
    trackedResidualCase('appendix_b6_right_to_erasure_tracked', 'Appendix B.6', requiredB6ResidualIds),
    productionResidualsAreNotDemoBlockers(),
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
