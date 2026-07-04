import { lintSmsMessage, renderSmsMessage } from './sms-disclosure'

export interface H5SmsGateCase {
  id: string
  ok: boolean
  decision: 'allowed' | 'blocked'
  reason?: string
}

export interface H5SmsGateReport {
  cases: H5SmsGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
    disclosureLeakageBlocked: boolean
  }
}

export function runH5SmsGate(): H5SmsGateReport {
  const english = renderSmsMessage({
    templateId: 'care_task_ready_v1',
    language: 'en',
    category: 'retinopathy_screening',
    slots: { programName: 'RHTP' },
  })
  const spanish = renderSmsMessage({
    templateId: 'care_task_ready_v1',
    language: 'es',
    category: 'retinopathy_screening',
    slots: { programName: 'RHTP' },
  })
  const sensitiveCategory = renderSmsMessage({
    templateId: 'care_task_ready_v1',
    language: 'en',
    category: 'sud',
    slots: { programName: 'RHTP' },
  })
  const unsafeSlot = renderSmsMessage({
    templateId: 'care_task_ready_v1',
    language: 'en',
    category: 'retinopathy_screening',
    slots: { programName: 'RHTP diabetes eye program' },
  })
  const conditionLint = lintSmsMessage('Your diabetes eye screening is overdue.')
  const cases: H5SmsGateCase[] = [
    {
      id: 'approved_english_template_passes',
      ok: english.ok && lintSmsMessage(english.message).ok,
      decision: english.ok ? 'allowed' : 'blocked',
      reason: english.ok ? undefined : english.reason,
    },
    {
      id: 'approved_spanish_template_passes',
      ok: spanish.ok && lintSmsMessage(spanish.message).ok,
      decision: spanish.ok ? 'allowed' : 'blocked',
      reason: spanish.ok ? undefined : spanish.reason,
    },
    {
      id: 'sensitive_category_blocked',
      ok: !sensitiveCategory.ok && sensitiveCategory.reason === 'category_excluded',
      decision: 'blocked',
      reason: sensitiveCategory.ok ? undefined : sensitiveCategory.reason,
    },
    {
      id: 'unsafe_slot_blocked',
      ok: !unsafeSlot.ok && unsafeSlot.reason === 'disclosure_lint_failed',
      decision: 'blocked',
      reason: unsafeSlot.ok ? undefined : unsafeSlot.reason,
    },
    {
      id: 'condition_name_lint_blocked',
      ok: !conditionLint.ok && conditionLint.terms.includes('diabetes') && conditionLint.terms.includes('eye screening'),
      decision: 'blocked',
      reason: conditionLint.ok ? undefined : conditionLint.reason,
    },
  ]
  const passed = cases.filter((testCase) => testCase.ok).length
  const disclosureLeakageBlocked = cases
    .filter((testCase) => testCase.decision === 'blocked')
    .every((testCase) => testCase.ok)

  return {
    cases,
    summary: {
      ok: passed === cases.length && disclosureLeakageBlocked,
      passed,
      total: cases.length,
      disclosureLeakageBlocked,
    },
  }
}
