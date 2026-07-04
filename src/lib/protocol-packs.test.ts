import { describe, expect, it } from 'vitest'

import {
  PROTOCOL_PACKS,
  p6PackIds,
  validateProtocolPack,
  validateProtocolPackRegistry,
} from './protocol-packs'

describe('P6 protocol pack registry', () => {
  it('ships retinopathy plus packs 2-4 as validated configuration', () => {
    const result = validateProtocolPackRegistry(PROTOCOL_PACKS)

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(PROTOCOL_PACKS.map((pack) => pack.packId)).toEqual([
      'retinopathy',
      'hypertension',
      'pdc_adherence',
      'transitional_care',
    ])
    expect(p6PackIds()).toEqual(['hypertension', 'pdc_adherence', 'transitional_care'])
  })

  it('blocks non-canonical observations, unknown tools, and denied safety actions', () => {
    const broken = validateProtocolPack({
      ...PROTOCOL_PACKS[1],
      deviceBindings: ['blood_pressure_systolic'],
      conversationTools: ['answer_education', 'invent_tool'],
      authorizedSafetyActions: ['summarize_pattern', 'diagnose'],
    })

    expect(broken.ok).toBe(false)
    expect(broken.errors).toEqual([
      'hypertension uses non-canonical observation blood_pressure_systolic',
      'hypertension authorizes unknown tool invent_tool',
      'hypertension authorizes denied safety action diagnose',
    ])
  })
})
