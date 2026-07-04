import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import type { BackendState } from './types'
import {
  approveBreakGlassAccess,
  completeBreakGlassPostHocReview,
  readSegmentedFactsWithBreakGlass,
  requestBreakGlassAccess,
} from './break-glass-access'
import { ingestHieDischargeEvent } from './part2-suppression'
import { createInitialBackendState } from './state'

function createPart2State(): { state: BackendState; factId: string } {
  const result = ingestHieDischargeEvent(createInitialBackendState(), {
    patientId: HERO_ID,
    sourceName: 'KHIE ADT feed',
    facilityName: 'Appalachian Recovery Center',
    dischargeDisposition: 'substance_use_treatment_discharge',
    effectiveDate: '2026-07-03',
    retrievedAt: '2026-07-04',
    fhirRef: 'Encounter/part2-sensitive',
  })
  const factId = result.acceptedSourceFact?.id
  if (!factId) throw new Error('Expected restricted Part 2 fact')
  return { state: result.state, factId }
}

function addPart2PurposeConsent(state: BackendState): BackendState {
  return {
    ...state,
    data: {
      ...state.data,
      consents: [
        ...state.data.consents,
        {
          id: 'consent_part2_break_glass',
          patientId: HERO_ID,
          status: 'active',
          scope: 'break_glass:emergency_care_coordination:part2_sud',
          category: 'part2_sud',
          version: 'v1',
          updatedAt: '2026-07-04',
        },
      ],
    },
  }
}

describe('H4 break-glass access rail', () => {
  it('blocks Part 2 break-glass approval without purpose-specific Part 2 consent', () => {
    const { state, factId } = createPart2State()
    const requested = requestBreakGlassAccess(state, {
      patientId: HERO_ID,
      category: 'part2_sud',
      purpose: 'emergency_care_coordination',
      requestedBy: 'nav_dana',
      sourceFactIds: [factId],
    })
    const approved = approveBreakGlassAccess(requested.state, {
      accessId: requested.access.id,
      approvedBy: 'privacy_officer',
    })
    const read = readSegmentedFactsWithBreakGlass(approved.state, {
      accessId: requested.access.id,
      now: '2026-07-04T09:05:00',
    })

    expect(approved.status).toBe('part2_consent_required')
    expect(read.facts).toHaveLength(0)
    expect(approved.state.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'break_glass_access',
          outcome: 'blocked',
          patientId: HERO_ID,
        }),
      ]),
    )
  })

  it('issues approved time-limited Part 2 access only when consent exists', () => {
    const { state, factId } = createPart2State()
    const requested = requestBreakGlassAccess(addPart2PurposeConsent(state), {
      patientId: HERO_ID,
      category: 'part2_sud',
      purpose: 'emergency_care_coordination',
      requestedBy: 'nav_dana',
      sourceFactIds: [factId],
    })
    const approved = approveBreakGlassAccess(requested.state, {
      accessId: requested.access.id,
      approvedBy: 'privacy_officer',
    })
    const read = readSegmentedFactsWithBreakGlass(approved.state, {
      accessId: requested.access.id,
      now: '2026-07-04T09:05:00',
    })

    expect(approved.status).toBe('active')
    expect(approved.access).toEqual(
      expect.objectContaining({
        status: 'active',
        expiresAt: '2026-07-04T09:30:00',
        reviewRequired: true,
      }),
    )
    expect(read.facts).toEqual([
      expect.objectContaining({
        id: factId,
        sensitiveCategory: 'part2_sud',
        aiContextSuppressed: true,
      }),
    ])
  })

  it('blocks expired break-glass reads before returning segmented facts', () => {
    const { state, factId } = createPart2State()
    const requested = requestBreakGlassAccess(addPart2PurposeConsent(state), {
      patientId: HERO_ID,
      category: 'part2_sud',
      purpose: 'emergency_care_coordination',
      requestedBy: 'nav_dana',
      sourceFactIds: [factId],
    })
    const approved = approveBreakGlassAccess(requested.state, {
      accessId: requested.access.id,
      approvedBy: 'privacy_officer',
    })
    const read = readSegmentedFactsWithBreakGlass(approved.state, {
      accessId: requested.access.id,
      now: '2026-07-04T10:00:00',
    })

    expect(read.status).toBe('expired')
    expect(read.facts).toHaveLength(0)
  })

  it('records mandatory post-hoc review for break-glass access', () => {
    const { state, factId } = createPart2State()
    const requested = requestBreakGlassAccess(addPart2PurposeConsent(state), {
      patientId: HERO_ID,
      category: 'part2_sud',
      purpose: 'emergency_care_coordination',
      requestedBy: 'nav_dana',
      sourceFactIds: [factId],
    })
    const approved = approveBreakGlassAccess(requested.state, {
      accessId: requested.access.id,
      approvedBy: 'privacy_officer',
    })
    const reviewed = completeBreakGlassPostHocReview(approved.state, {
      accessId: requested.access.id,
      reviewer: 'privacy_officer',
      outcome: 'confirmed_appropriate',
    })

    expect(reviewed.status).toBe('reviewed')
    expect(reviewed.access?.reviewOutcome).toBe('confirmed_appropriate')
    expect(reviewed.state.auditEvents.at(-1)).toEqual(
      expect.objectContaining({
        action: 'break_glass_post_hoc_review',
        outcome: 'allowed',
      }),
    )
  })

  it('fails closed for adolescent-confidential access until the Kentucky policy decision is approved', () => {
    const { state, factId } = createPart2State()
    const requested = requestBreakGlassAccess(addPart2PurposeConsent(state), {
      patientId: HERO_ID,
      category: 'adolescent',
      purpose: 'emergency_care_coordination',
      requestedBy: 'nav_dana',
      sourceFactIds: [factId],
    })
    const approved = approveBreakGlassAccess(requested.state, {
      accessId: requested.access.id,
      approvedBy: 'privacy_officer',
    })

    expect(approved.status).toBe('adolescent_policy_required')
    expect(approved.access?.status).toBe('denied')
  })
})
