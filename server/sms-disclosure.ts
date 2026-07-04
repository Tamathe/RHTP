export type SmsLanguage = 'en' | 'es' | string
export type SmsOutreachCategory =
  | 'retinopathy_screening'
  | 'appointment_logistics'
  | 'generic_care_task'
  | 'behavioral_health'
  | 'sud'
  | 'reproductive_health'
  | 'hiv'
  | 'interpersonal_safety'
  | string

export interface RenderSmsMessageInput {
  templateId: string
  language: SmsLanguage
  category: SmsOutreachCategory
  slots: Record<string, string>
}

export type SmsLintResult =
  | { ok: true }
  | {
      ok: false
      reason: 'prohibited_term'
      terms: string[]
    }

export type RenderSmsMessageResult =
  | { ok: true; message: string }
  | {
      ok: false
      reason:
        | 'category_excluded'
        | 'template_not_approved'
        | 'language_not_available'
        | 'missing_slot'
        | 'disclosure_lint_failed'
      message: string
    }

interface ApprovedSmsTemplate {
  id: string
  requiredSlots: string[]
  bodyByLanguage: Record<string, string>
}

const EXCLUDED_CATEGORIES = new Set([
  'behavioral_health',
  'sud',
  'reproductive_health',
  'hiv',
  'interpersonal_safety',
])

const PROHIBITED_TERMS = [
  'diabetes',
  'eye screening',
  'retinopathy',
  'depression',
  'suicide',
  'hiv',
  'substance',
  'opioid',
  'methadone',
  'pregnancy',
  'abuse',
  'violence',
  'diabetes',
  'deteccion de ojos',
  'vih',
  'depresion',
  'sustancia',
  'opioide',
  'embarazo',
  'violencia',
]

const APPROVED_TEMPLATES: ApprovedSmsTemplate[] = [
  {
    id: 'care_task_ready_v1',
    requiredSlots: ['programName'],
    bodyByLanguage: {
      en: '{{programName}} has a care task ready for you. Call your care team or open the app. Reply STOP to opt out.',
      es: '{{programName}} tiene una tarea de cuidado lista. Llame a su equipo de cuidado o abra la app. Responda STOP para salir.',
    },
  },
]

function approvedTemplate(templateId: string): ApprovedSmsTemplate | undefined {
  return APPROVED_TEMPLATES.find((template) => template.id === templateId)
}

function renderTemplate(template: ApprovedSmsTemplate, language: string, slots: Record<string, string>): string {
  return template.requiredSlots.reduce(
    (message, slot) => message.replaceAll(`{{${slot}}}`, slots[slot] ?? ''),
    template.bodyByLanguage[language],
  )
}

export function lintSmsMessage(message: string): SmsLintResult {
  const normalized = message.toLowerCase()
  const terms = PROHIBITED_TERMS.filter((term, index) => {
    if (PROHIBITED_TERMS.indexOf(term) !== index) return false
    return normalized.includes(term)
  })

  return terms.length === 0 ? { ok: true } : { ok: false, reason: 'prohibited_term', terms }
}

export function renderSmsMessage(input: RenderSmsMessageInput): RenderSmsMessageResult {
  if (EXCLUDED_CATEGORIES.has(input.category)) {
    return {
      ok: false,
      reason: 'category_excluded',
      message: 'SMS category is excluded from lock-screen outreach.',
    }
  }

  const template = approvedTemplate(input.templateId)
  if (!template) {
    return {
      ok: false,
      reason: 'template_not_approved',
      message: 'SMS template is not approved.',
    }
  }

  if (!template.bodyByLanguage[input.language]) {
    return {
      ok: false,
      reason: 'language_not_available',
      message: 'SMS template language is not available.',
    }
  }

  if (template.requiredSlots.some((slot) => !input.slots[slot]?.trim())) {
    return {
      ok: false,
      reason: 'missing_slot',
      message: 'SMS template is missing a required slot.',
    }
  }

  const message = renderTemplate(template, input.language, input.slots)
  const lint = lintSmsMessage(message)
  if (!lint.ok) {
    return {
      ok: false,
      reason: 'disclosure_lint_failed',
      message: 'SMS copy contains prohibited health or safety disclosure text.',
    }
  }

  return { ok: true, message }
}
