import type { NavigatorQueueReason } from '../types'

export type SafetyAction =
  | 'answer_education'
  | 'collect_barrier'
  | 'match_site'
  | 'confirm_plan'
  | 'diagnose_symptom'
  | 'change_medication'
  | 'reassure_red_flag'

export interface SafetyScreeningResult {
  category: 'normal' | 'red_flag' | 'off_protocol'
  patientCopy: string
  navigatorSummary: string
  queueReason?: NavigatorQueueReason
}

const RED_FLAG_PATTERNS = [
  /sudden(?:ly)?\s+(?:lost|loss|lose).{0,24}vision/i,
  /sudden(?:ly)?\s+vision\s+loss/i,
  /sudden(?:ly)?\s+vision\s+changes?/i,
  /loss\s+of\s+vision/i,
  /new\s+(?:flashes|floaters)/i,
  /flashes?\s+and\s+floaters?/i,
  /eye\s+pain/i,
  /curtain.{0,24}vision/i,
]

const OFF_PROTOCOL_PATTERNS = [
  /do i have/i,
  /diagnos/i,
  /change.{0,24}(?:insulin|medicine|medication|metformin)/i,
  /stop.{0,24}(?:insulin|medicine|medication|metformin)/i,
  /should i take/i,
]

export function screenPatientMessage(input: string): SafetyScreeningResult {
  if (RED_FLAG_PATTERNS.some((pattern) => pattern.test(input))) {
    return {
      category: 'red_flag',
      queueReason: 'red_flag_symptom',
      patientCopy:
        'That could be urgent. Sandy cannot diagnose this, so a navigator should help you get human guidance now.',
      navigatorSummary: `Patient reported a possible vision red flag: "${input}"`,
    }
  }

  if (OFF_PROTOCOL_PATTERNS.some((pattern) => pattern.test(input))) {
    return {
      category: 'off_protocol',
      patientCopy:
        'Sandy can help with screening steps, barriers, and reminders, but clinical advice needs a care-team review.',
      navigatorSummary: `Patient asked an off-protocol clinical question: "${input}"`,
    }
  }

  return {
    category: 'normal',
    patientCopy: 'Sandy can keep helping with the retinopathy screening plan.',
    navigatorSummary: `Patient message stayed inside the retinopathy outreach protocol: "${input}"`,
  }
}

export function isAutonomousActionAllowed(action: SafetyAction): boolean {
  return (
    action === 'answer_education' ||
    action === 'collect_barrier' ||
    action === 'match_site' ||
    action === 'confirm_plan'
  )
}
