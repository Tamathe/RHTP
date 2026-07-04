import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../data/seed'
import type { SourceFact } from '../types'
import {
  containsClinicalAdjacentClaim,
  extractQuantitativeClaims,
  verifyGrounding,
} from './grounding'

const sourceFacts: SourceFact[] = [
  {
    id: 'fact_diabetes',
    patientId: HERO_ID,
    label: 'Diabetes diagnosis',
    value: 'Type 2 diabetes on imported problem evidence',
    sourceKind: 'hie',
    sourceName: 'Kentucky HIE pilot feed',
    retrievedAt: '2026-07-01',
    effectiveDate: '2024-11-18',
    confidence: 'confirmed',
    patientConfirmed: true,
    navigatorOverridden: false,
    fhirRef: 'Condition/fact_diabetes',
  },
  {
    id: 'fact_a1c',
    patientId: HERO_ID,
    label: 'Recent A1C',
    value: '8.4 on 2026-05-12',
    sourceKind: 'hie',
    sourceName: 'Kentucky HIE pilot feed',
    retrievedAt: '2026-07-01',
    effectiveDate: '2026-05-12',
    confidence: 'confirmed',
    patientConfirmed: true,
    navigatorOverridden: false,
    fhirRef: 'Observation/fact_a1c',
  },
  {
    id: 'fact_gap',
    patientId: HERO_ID,
    label: 'Retinal screening gap',
    value: 'No retinal screening claim found in the last 12 months',
    sourceKind: 'claims',
    sourceName: 'Claims gap file',
    retrievedAt: '2026-07-01',
    effectiveDate: '2026-06-30',
    confidence: 'probable',
    patientConfirmed: false,
    navigatorOverridden: false,
    fhirRef: 'CoverageEligibilityResponse/fact_gap',
  },
  {
    id: 'fact_site',
    patientId: HERO_ID,
    label: 'Screening site availability',
    value: 'FQHC mobile camera has Saturday appointments and ride support',
    sourceKind: 'site_feed',
    sourceName: 'RHTP screening site feed',
    retrievedAt: '2026-07-01',
    effectiveDate: '2026-07-06',
    confidence: 'confirmed',
    patientConfirmed: true,
    navigatorOverridden: false,
  },
]

describe('containsClinicalAdjacentClaim', () => {
  it('recognizes patient-specific clinical-adjacent answer text', () => {
    expect(containsClinicalAdjacentClaim('Your last A1C was 8.4.')).toBe(true)
    expect(containsClinicalAdjacentClaim('This screening site has Saturday appointments.')).toBe(true)
    expect(containsClinicalAdjacentClaim('What would you like help with next?')).toBe(false)
  })
})

describe('extractQuantitativeClaims', () => {
  it('extracts A1C and month claims for deterministic comparison', () => {
    expect(
      extractQuantitativeClaims(
        'Your last A1C was 8.4, and it has been 19 months since your last eye screening.',
      ),
    ).toEqual([
      { kind: 'a1c', value: '8.4' },
      { kind: 'months_since_screening', value: '19' },
    ])
  })
})

describe('verifyGrounding', () => {
  it('allows supported patient-specific retinopathy outreach copy', () => {
    const result = verifyGrounding({
      answer:
        'You have diabetes, your last A1C was 8.4, and there is no retinal screening claim found in the last 12 months. The mobile camera has Saturday appointments and ride support.',
      sourceFacts,
    })

    expect(result.allowed).toBe(true)
    expect(result.findings.map((finding) => finding.status)).not.toContain('blocked')
    expect(result.supportedSourceFactIds).toEqual(
      expect.arrayContaining(['fact_diabetes', 'fact_a1c', 'fact_gap', 'fact_site']),
    )
  })

  it('blocks unsupported A1C numbers', () => {
    const result = verifyGrounding({
      answer: 'Your last A1C was 9.9, so you need this screening now.',
      sourceFacts,
    })

    expect(result.allowed).toBe(false)
    expect(result.blockedReasons).toContain('unsupported_numeric_claim:a1c:9.9')
  })

  it('blocks unsupported normal-result and diagnosis claims', () => {
    const result = verifyGrounding({
      answer: 'Your eye screening was normal, and you do not have diabetic retinopathy.',
      sourceFacts,
    })

    expect(result.allowed).toBe(false)
    expect(result.blockedReasons).toEqual(
      expect.arrayContaining(['unsupported_normal_result_claim', 'diagnosis_claim']),
    )
  })

  it('blocks medication-change instructions', () => {
    const result = verifyGrounding({
      answer: 'You should stop taking metformin before your eye screening.',
      sourceFacts,
    })

    expect(result.allowed).toBe(false)
    expect(result.blockedReasons).toContain('medication_change_claim')
  })

  it('blocks clinical-adjacent claims with no supporting source facts', () => {
    const result = verifyGrounding({
      answer: 'Your diabetes and eye history show that you are overdue.',
      sourceFacts: [],
    })

    expect(result.allowed).toBe(false)
    expect(result.blockedReasons).toContain('clinical_adjacent_claim_without_sources')
  })
})
