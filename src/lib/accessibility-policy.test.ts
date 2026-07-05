import { describe, expect, it } from 'vitest'

import { seed, HERO_ID } from '../data/seed'
import { PROTOCOL_PACKS } from './protocol-packs'
import {
  accessibilityProfileForPatient,
  educationMeetsAccessibilityFloor,
  patientAccessibilitySummary,
} from './accessibility-policy'

const hero = seed.patients.find((patient) => patient.id === HERO_ID)

describe('accessibility policy', () => {
  it('maps patient accessibility preferences to concrete rendering affordances', () => {
    expect(hero).toBeDefined()

    const profile = accessibilityProfileForPatient(hero!)

    expect(profile).toMatchObject({
      ariaLabel: 'RHTP phone demo with large text, high contrast, screen reader, keyboard, read aloud affordances',
      minTouchTargetPx: 44,
      readAloud: true,
      screenReader: true,
      keyboardNavigation: true,
      highContrast: true,
      largeText: true,
    })
    expect(profile.className).toContain('text-[17px]')
    expect(profile.className).toContain('contrast-125')
  })

  it('requires every demo protocol-pack education module to satisfy the hero patient preferences', () => {
    expect(
      PROTOCOL_PACKS.map((pack) => ({
        packId: pack.packId,
        ok: educationMeetsAccessibilityFloor(pack.education, hero!),
      })),
    ).toEqual(PROTOCOL_PACKS.map((pack) => ({ packId: pack.packId, ok: true })))
  })

  it('summarizes patient accessibility needs for release evidence', () => {
    expect(patientAccessibilitySummary(hero!)).toBe('language=en; prefs=read_aloud,large_text,screen_reader,high_contrast,keyboard_navigation')
  })
})
