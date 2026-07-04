import { describe, expect, it } from 'vitest'

import { runP6ProtocolPackGate } from './p6-protocol-pack-gate'

describe('runP6ProtocolPackGate', () => {
  it('passes the local P6 pack-is-config proof cases', () => {
    const report = runP6ProtocolPackGate()

    expect(report.summary).toEqual({ ok: true, passed: 6, total: 6 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'p6_pack_registry_contains_packs_2_4',
      'p6_packs_validate_cleanly',
      'p6_packs_reuse_shared_tools',
      'p6_no_denied_safety_actions',
      'p6_config_only_rail_surface',
      'p6_transitional_care_declares_adt_discharge',
    ])
  })
})
