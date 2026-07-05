import releaseLedger from '../docs/ops/rhtp-release-ledger.json'
import { HERO_ID, seed } from '../src/data/seed'
import {
  accessibilityProfileForPatient,
  educationMeetsAccessibilityFloor,
  patientAccessibilitySummary,
} from '../src/lib/accessibility-policy'
import { PROTOCOL_PACKS } from '../src/lib/protocol-packs'

export interface AccessibilityGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface AccessibilityGateReport {
  cases: AccessibilityGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

interface SpecResidualEntry {
  id: string
  status: string
  demoBlocker: boolean
  proof: string[]
}

interface ReleaseLedger {
  specResiduals?: SpecResidualEntry[]
}

const ledger = releaseLedger as ReleaseLedger

function demoPatientsDeclareAccessibilityPreferences(): AccessibilityGateCase {
  const missing = seed.patients
    .filter((patient) => patient.language.trim().length === 0 || patient.accessibilityPrefs.length === 0)
    .map((patient) => patient.id)

  return {
    id: 'demo_patients_declare_accessibility_preferences',
    ok: missing.length === 0,
    detail: missing.length === 0 ? `patients=${seed.patients.length}` : `missing=${missing.join(',')}`,
  }
}

function educationModulesHaveWcagAaAttestations(): AccessibilityGateCase {
  const missing = PROTOCOL_PACKS.filter(
    (pack) =>
      pack.education.accessibility.wcagTarget !== 'WCAG_2_1_AA' ||
      !pack.education.accessibility.readAloud ||
      !pack.education.accessibility.largeText ||
      !pack.education.accessibility.screenReader ||
      !pack.education.accessibility.highContrast ||
      !pack.education.accessibility.keyboardNavigation ||
      !pack.education.accessibility.lowLiteracy,
  ).map((pack) => pack.packId)

  return {
    id: 'education_modules_have_wcag_aa_attestations',
    ok: missing.length === 0,
    detail: missing.length === 0 ? `packs=${PROTOCOL_PACKS.length}` : `missing=${missing.join(',')}`,
  }
}

function patientPreferencesAreSatisfiedByPackContent(): AccessibilityGateCase {
  const failures = seed.patients.flatMap((patient) =>
    PROTOCOL_PACKS.filter((pack) => !educationMeetsAccessibilityFloor(pack.education, patient)).map(
      (pack) => `${patient.id}:${pack.packId}`,
    ),
  )

  return {
    id: 'patient_preferences_are_satisfied_by_pack_content',
    ok: failures.length === 0,
    detail: failures.length === 0 ? `patientPackPairs=${seed.patients.length * PROTOCOL_PACKS.length}` : failures.join(','),
  }
}

function phoneProfileExposesRenderingAffordances(): AccessibilityGateCase {
  const hero = seed.patients.find((patient) => patient.id === HERO_ID)
  if (hero === undefined) {
    return {
      id: 'phone_profile_exposes_rendering_affordances',
      ok: false,
      detail: 'hero patient missing',
    }
  }

  const profile = accessibilityProfileForPatient(hero)
  const ok =
    profile.readAloud &&
    profile.largeText &&
    profile.screenReader &&
    profile.highContrast &&
    profile.keyboardNavigation &&
    profile.minTouchTargetPx >= 44 &&
    profile.className.includes('text-[17px]') &&
    profile.className.includes('contrast-125')

  return {
    id: 'phone_profile_exposes_rendering_affordances',
    ok,
    detail: patientAccessibilitySummary(hero),
  }
}

function accessibilityResidualIsLocalControlVerified(): AccessibilityGateCase {
  const residual = ledger.specResiduals?.find((entry) => entry.id === 'B4_ACCESSIBILITY_WCAG')
  const ok =
    residual !== undefined &&
    residual.status === 'local_control_verified_production_backlog' &&
    residual.demoBlocker === false &&
    residual.proof.includes('npm run accessibility:gate')

  return {
    id: 'accessibility_residual_is_local_control_verified',
    ok,
    detail: residual ? `${residual.status}; demoBlocker=${residual.demoBlocker}` : 'B4_ACCESSIBILITY_WCAG missing',
  }
}

export function runAccessibilityGate(): AccessibilityGateReport {
  const cases: AccessibilityGateCase[] = [
    demoPatientsDeclareAccessibilityPreferences(),
    educationModulesHaveWcagAaAttestations(),
    patientPreferencesAreSatisfiedByPackContent(),
    phoneProfileExposesRenderingAffordances(),
    accessibilityResidualIsLocalControlVerified(),
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
