import {
  PROTOCOL_PACKS,
  p6PackIds,
  validateProtocolPackRegistry,
  type ProtocolPack,
  type ProtocolPackId,
  type SafetyAction,
} from '../src/lib/protocol-packs'

export interface P6ProtocolPackGateCase {
  id: string
  ok: boolean
  detail: string
}

export interface P6ProtocolPackGateReport {
  cases: P6ProtocolPackGateCase[]
  summary: {
    ok: boolean
    passed: number
    total: number
  }
}

const expectedP6PackIds: ProtocolPackId[] = ['hypertension', 'pdc_adherence', 'transitional_care']
const deniedSafetyActions = new Set<SafetyAction>(['change_medication', 'dose_insulin', 'diagnose', 'autonomous_triage'])

function p6Packs(): ProtocolPack[] {
  return PROTOCOL_PACKS.filter((pack) => expectedP6PackIds.includes(pack.packId))
}

function hasOnlySharedRailReuse(pack: ProtocolPack): boolean {
  return Object.values(pack.railReuse).every((rail) => rail === 'shared')
}

function sortedValues(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right))
}

export function runP6ProtocolPackGate(): P6ProtocolPackGateReport {
  const packs = p6Packs()
  const registryValidation = validateProtocolPackRegistry(PROTOCOL_PACKS)
  const retinopathy = PROTOCOL_PACKS.find((pack) => pack.packId === 'retinopathy')
  const sharedTools = retinopathy?.conversationTools ?? []
  const p6ToolSets = packs.map((pack) => sortedValues(pack.conversationTools).join(','))
  const deniedActions = packs.flatMap((pack) =>
    pack.authorizedSafetyActions
      .filter((action) => deniedSafetyActions.has(action as SafetyAction))
      .map((action) => `${pack.packId}:${action}`),
  )
  const transitionalCare = PROTOCOL_PACKS.find((pack) => pack.packId === 'transitional_care')

  const cases: P6ProtocolPackGateCase[] = [
    {
      id: 'p6_pack_registry_contains_packs_2_4',
      ok: p6PackIds().join(',') === expectedP6PackIds.join(','),
      detail: `p6PackIds=${p6PackIds().join(',')}`,
    },
    {
      id: 'p6_packs_validate_cleanly',
      ok: registryValidation.ok,
      detail: registryValidation.ok ? 'registry valid' : registryValidation.errors.join('; '),
    },
    {
      id: 'p6_packs_reuse_shared_tools',
      ok:
        sharedTools.length > 0 &&
        p6ToolSets.every((toolSet) => toolSet === sortedValues(sharedTools).join(',')),
      detail: p6ToolSets.join(' | '),
    },
    {
      id: 'p6_no_denied_safety_actions',
      ok: deniedActions.length === 0,
      detail: deniedActions.length === 0 ? 'no denied safety actions' : deniedActions.join(','),
    },
    {
      id: 'p6_config_only_rail_surface',
      ok: packs.length === 3 && packs.every(hasOnlySharedRailReuse),
      detail: packs.map((pack) => `${pack.packId}:shared`).join(','),
    },
    {
      id: 'p6_transitional_care_declares_adt_discharge',
      ok:
        transitionalCare?.cohort.adtEvents?.includes('discharge') === true &&
        transitionalCare.insightRules.some(
          (rule) => rule.ruleId === 'insight.transition.discharge_followup_due',
        ) &&
        transitionalCare.navigatorWorkTypes.includes('outreach_followup'),
      detail: `adtEvents=${transitionalCare?.cohort.adtEvents?.join(',') ?? 'missing'}`,
    },
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
