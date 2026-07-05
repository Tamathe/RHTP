import { describe, expect, it } from 'vitest'

import packageJson from '../package.json'
import {
  localReleaseGateCommands,
  validateLocalReleaseGate,
  type PackageScripts,
} from './local-release-gate'

const packageScripts: PackageScripts = {
  'ops:status': 'tsx scripts/rhtp-status.ts',
  'safety:gate': 'tsx scripts/rhtp-safety-gate.ts',
  'identity:gate': 'tsx scripts/rhtp-identity-gate.ts',
  'async:gate': 'tsx scripts/rhtp-async-access-gate.ts',
  'part2:gate': 'tsx scripts/rhtp-part2-gate.ts',
  'sms:gate': 'tsx scripts/rhtp-sms-gate.ts',
  'd2:gate': 'tsx scripts/rhtp-d2-adolescent-consent-gate.ts',
  'p3:gate': 'tsx scripts/rhtp-p3-ingestion-gate.ts',
  'd4:gate': 'tsx scripts/rhtp-d4-pdc-gate.ts',
  'p5:gate': 'tsx scripts/rhtp-p5-device-gate.ts',
  'h4:gate': 'tsx scripts/rhtp-h4-break-glass-gate.ts',
  'p6:gate': 'tsx scripts/rhtp-p6-protocol-pack-gate.ts',
  'p7:gate': 'tsx scripts/rhtp-p7-screenings-campaigns-gate.ts',
  'p8:gate': 'tsx scripts/rhtp-p8-writeback-gate.ts',
  'preview:gate': 'npm run demo:gate && tsx scripts/rhtp-static-preview-smoke.ts',
  test: 'vitest run',
}

describe('local release gate', () => {
  it('is exposed as the local release npm script', () => {
    expect(packageJson.scripts['release:gate']).toBe('tsx scripts/rhtp-local-release-gate.ts')
  })

  it('defines the full local no-PHI proof run without public deployment verification', () => {
    expect(localReleaseGateCommands).toEqual([
      { id: 'ops_status_blockers', script: 'ops:status', args: ['--', '--blockers'] },
      { id: 'safety_gate', script: 'safety:gate' },
      { id: 'identity_gate', script: 'identity:gate' },
      { id: 'async_gate', script: 'async:gate' },
      { id: 'part2_gate', script: 'part2:gate' },
      { id: 'sms_gate', script: 'sms:gate' },
      { id: 'd2_gate', script: 'd2:gate' },
      { id: 'p3_gate', script: 'p3:gate' },
      { id: 'd4_gate', script: 'd4:gate' },
      { id: 'p5_gate', script: 'p5:gate' },
      { id: 'h4_gate', script: 'h4:gate' },
      { id: 'p6_gate', script: 'p6:gate' },
      { id: 'p7_gate', script: 'p7:gate' },
      { id: 'p8_gate', script: 'p8:gate' },
      { id: 'preview_gate', script: 'preview:gate' },
      { id: 'test_suite', script: 'test' },
    ])
    expect(localReleaseGateCommands.some((command) => command.script === 'preview:verify')).toBe(false)
  })

  it('passes when scripts exist and the real-PHI flag is off', () => {
    const report = validateLocalReleaseGate({ env: {}, packageScripts })

    expect(report.summary).toEqual({ ok: true, passed: 3, total: 3 })
    expect(report.cases.map((testCase) => testCase.id)).toEqual([
      'local_release_required_scripts_exist',
      'local_release_excludes_public_preview_verifier',
      'local_release_real_phi_flag_is_off',
    ])
  })

  it('fails when a required script is missing', () => {
    const { 'p8:gate': _removed, ...incompleteScripts } = packageScripts
    const report = validateLocalReleaseGate({ env: {}, packageScripts: incompleteScripts })

    expect(report.summary.ok).toBe(false)
    expect(report.cases.find((testCase) => testCase.id === 'local_release_required_scripts_exist')).toMatchObject({
      ok: false,
      detail: 'missing scripts: p8:gate',
    })
  })

  it('fails when real-PHI is enabled', () => {
    const report = validateLocalReleaseGate({ env: { RHTP_REAL_PHI: 'true' }, packageScripts })

    expect(report.summary.ok).toBe(false)
    expect(report.cases.find((testCase) => testCase.id === 'local_release_real_phi_flag_is_off')).toMatchObject({
      ok: false,
      detail: 'RHTP_REAL_PHI=true',
    })
  })
})
