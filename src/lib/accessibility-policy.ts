import type { AccessibilityPreference, Patient } from '../types'
import type { EducationModuleRef } from './protocol-packs'

export interface AccessibilityRenderingProfile {
  ariaLabel: string
  className: string
  highContrast: boolean
  keyboardNavigation: boolean
  largeText: boolean
  minTouchTargetPx: number
  readAloud: boolean
  screenReader: boolean
}

const preferenceOrder: AccessibilityPreference[] = [
  'read_aloud',
  'large_text',
  'screen_reader',
  'high_contrast',
  'keyboard_navigation',
]

const ariaPreferenceOrder: AccessibilityPreference[] = [
  'large_text',
  'high_contrast',
  'screen_reader',
  'keyboard_navigation',
  'read_aloud',
]

const preferenceLabels: Record<AccessibilityPreference, string> = {
  high_contrast: 'high contrast',
  keyboard_navigation: 'keyboard',
  large_text: 'large text',
  read_aloud: 'read aloud',
  screen_reader: 'screen reader',
}

function hasPreference(patient: Patient, preference: AccessibilityPreference): boolean {
  return patient.accessibilityPrefs.includes(preference)
}

export function accessibilityProfileForPatient(patient: Patient): AccessibilityRenderingProfile {
  const largeText = hasPreference(patient, 'large_text')
  const highContrast = hasPreference(patient, 'high_contrast')
  const screenReader = hasPreference(patient, 'screen_reader')
  const keyboardNavigation = hasPreference(patient, 'keyboard_navigation')
  const readAloud = hasPreference(patient, 'read_aloud')
  const enabledLabels = ariaPreferenceOrder
    .filter((preference) => hasPreference(patient, preference))
    .map((preference) => preferenceLabels[preference])

  return {
    ariaLabel: `RHTP phone demo with ${enabledLabels.join(', ')} affordances`,
    className: [
      largeText ? 'text-[17px] leading-7' : 'text-base',
      highContrast ? 'contrast-125' : '',
      keyboardNavigation ? 'focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-teal-700' : '',
    ]
      .filter(Boolean)
      .join(' '),
    highContrast,
    keyboardNavigation,
    largeText,
    minTouchTargetPx: 44,
    readAloud,
    screenReader,
  }
}

export function educationMeetsAccessibilityFloor(education: EducationModuleRef, patient: Patient): boolean {
  if (education.readingLevelGrade > 6) return false
  if (!education.languages.includes(patient.language)) return false
  if (education.accessibility.wcagTarget !== 'WCAG_2_1_AA') return false
  if (!education.accessibility.lowLiteracy) return false
  if (hasPreference(patient, 'read_aloud') && (!education.readAloud || !education.accessibility.readAloud)) return false
  if (hasPreference(patient, 'large_text') && !education.accessibility.largeText) return false
  if (hasPreference(patient, 'screen_reader') && !education.accessibility.screenReader) return false
  if (hasPreference(patient, 'high_contrast') && !education.accessibility.highContrast) return false
  if (hasPreference(patient, 'keyboard_navigation') && !education.accessibility.keyboardNavigation) return false

  return true
}

export function patientAccessibilitySummary(patient: Patient): string {
  const orderedPrefs = preferenceOrder.filter((preference) => patient.accessibilityPrefs.includes(preference))
  return `language=${patient.language}; prefs=${orderedPrefs.join(',')}`
}
