import { describe, expect, it } from 'vitest'
import { lintSmsMessage, renderSmsMessage } from './sms-disclosure'

describe('SMS disclosure controls', () => {
  it('renders approved English and Spanish templates without condition leakage', () => {
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

    expect(english).toEqual({
      ok: true,
      message: 'RHTP has a care task ready for you. Call your care team or open the app. Reply STOP to opt out.',
    })
    expect(spanish).toEqual({
      ok: true,
      message:
        'RHTP tiene una tarea de cuidado lista. Llame a su equipo de cuidado o abra la app. Responda STOP para salir.',
    })
    if (english.ok) expect(lintSmsMessage(english.message).ok).toBe(true)
    if (spanish.ok) expect(lintSmsMessage(spanish.message).ok).toBe(true)
  })

  it('blocks sensitive categories even when the copy is generic', () => {
    const result = renderSmsMessage({
      templateId: 'care_task_ready_v1',
      language: 'en',
      category: 'sud',
      slots: { programName: 'RHTP' },
    })

    expect(result).toEqual({
      ok: false,
      reason: 'category_excluded',
      message: 'SMS category is excluded from lock-screen outreach.',
    })
  })

  it('blocks condition names and unsafe slot values in every rendered message', () => {
    const unsafeSlot = renderSmsMessage({
      templateId: 'care_task_ready_v1',
      language: 'en',
      category: 'retinopathy_screening',
      slots: { programName: 'RHTP diabetes eye program' },
    })
    const lint = lintSmsMessage('Your diabetes eye screening is overdue.')

    expect(unsafeSlot).toEqual({
      ok: false,
      reason: 'disclosure_lint_failed',
      message: 'SMS copy contains prohibited health or safety disclosure text.',
    })
    expect(lint).toEqual({
      ok: false,
      reason: 'prohibited_term',
      terms: ['diabetes', 'eye screening'],
    })
  })

  it('rejects unknown templates and missing language bundles', () => {
    expect(
      renderSmsMessage({
        templateId: 'model_personalized_reason_line',
        language: 'en',
        category: 'retinopathy_screening',
        slots: { programName: 'RHTP' },
      }),
    ).toEqual({
      ok: false,
      reason: 'template_not_approved',
      message: 'SMS template is not approved.',
    })
    expect(
      renderSmsMessage({
        templateId: 'care_task_ready_v1',
        language: 'fr',
        category: 'retinopathy_screening',
        slots: { programName: 'RHTP' },
      }),
    ).toEqual({
      ok: false,
      reason: 'language_not_available',
      message: 'SMS template language is not available.',
    })
  })
})
