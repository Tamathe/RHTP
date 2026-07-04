# P6 Protocol Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the no-PHI P6 platform proof that hypertension, diabetes medication adherence, and transitional care are declared as protocol-pack configuration on the same rails as retinopathy.

**Architecture:** Add a typed manifest registry in `src/lib/protocol-packs.ts`, with deterministic validation for the P6 packager checks the prototype can honestly prove. Add a server gate in `server/p6-protocol-pack-gate.ts` plus `npm run p6:gate`, and update the release ledger/docs only after tests prove the gate.

**Tech Stack:** TypeScript, Vitest, existing `tsx` script pattern, existing JSON release ledger.

## Global Constraints

- No real PHI: P6 demo proof uses synthetic/local manifests and existing seed rails only.
- Protocol packs are configuration and content: adding packs must not require new navigator, barrier, site-match, Sandy tool, or state-machine branches.
- Real KHIE ADT, real claims feeds, and EMR writeback remain out of scope for the stakeholder demo.
- Safety bright line remains: no dosing, no diagnosis, no autonomous triage.
- `RHTP_REAL_PHI` stays off or unset.

---

### Task 1: Protocol-Pack Registry and Validator

**Files:**
- Create: `src/lib/protocol-packs.ts`
- Create: `src/lib/protocol-packs.test.ts`

**Interfaces:**
- Produces: `PROTOCOL_PACKS`, `validateProtocolPack(pack)`, `validateProtocolPackRegistry(packs)`, and `p6PackIds()`.
- Consumes: existing `PackId`, `ToolName`, and shared safety rail names from `src/types.ts`.

- [ ] **Step 1: Write the failing registry test**

```ts
import { describe, expect, it } from 'vitest'
import { PROTOCOL_PACKS, p6PackIds, validateProtocolPackRegistry } from './protocol-packs'

describe('P6 protocol pack registry', () => {
  it('ships retinopathy plus packs 2-4 as validated configuration', () => {
    const result = validateProtocolPackRegistry(PROTOCOL_PACKS)

    expect(result.ok).toBe(true)
    expect(p6PackIds()).toEqual(['hypertension', 'pdc_adherence', 'transitional_care'])
  })
})
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run src/lib/protocol-packs.test.ts`

Expected: FAIL because `src/lib/protocol-packs.ts` is missing.

- [ ] **Step 3: Implement minimal registry and validator**

Create the manifest types, canonical observation/tool/safety-action sets, four pack manifests, and validation errors for missing languages, non-canonical observations, denied safety actions, unknown tools, missing insight rules, missing red-team suite, and missing outcome metrics.

- [ ] **Step 4: Verify green**

Run: `npx vitest run src/lib/protocol-packs.test.ts`

Expected: PASS.

### Task 2: P6 Gate Command

**Files:**
- Create: `server/p6-protocol-pack-gate.ts`
- Create: `server/p6-protocol-pack-gate.test.ts`
- Create: `scripts/rhtp-p6-protocol-pack-gate.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `PROTOCOL_PACKS` and `validateProtocolPackRegistry`.
- Produces: `runP6ProtocolPackGate()` report with case ids and pass counts.

- [ ] **Step 1: Write the failing gate test**

```ts
import { describe, expect, it } from 'vitest'
import { runP6ProtocolPackGate } from './p6-protocol-pack-gate'

describe('runP6ProtocolPackGate', () => {
  it('passes the local P6 pack-is-config proof cases', () => {
    const report = runP6ProtocolPackGate()

    expect(report.summary).toEqual({ ok: true, passed: 6, total: 6 })
  })
})
```

- [ ] **Step 2: Verify red**

Run: `npx vitest run server/p6-protocol-pack-gate.test.ts`

Expected: FAIL because `server/p6-protocol-pack-gate.ts` is missing.

- [ ] **Step 3: Implement the gate and script**

Gate cases:
`p6_pack_registry_contains_packs_2_4`, `p6_packs_validate_cleanly`, `p6_packs_reuse_shared_tools`, `p6_no_denied_safety_actions`, `p6_config_only_rail_surface`, `p6_transitional_care_declares_adt_discharge`.

- [ ] **Step 4: Verify green**

Run: `npx vitest run server/p6-protocol-pack-gate.test.ts`

Expected: PASS.

### Task 3: Ledger, Docs, and Receipt

**Files:**
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Modify: `docs/ops/RHTP-FEATURE-FLAGS.md`
- Create: `docs/ops/red-team-results/2026-07-04-p6-protocol-pack-gate.md`

**Interfaces:**
- Consumes: `npm run p6:gate` output.
- Produces: P6 status proof that is demo-ready/config-verified while KHIE/claims remain real integration work.

- [ ] **Step 1: Update P6 status artifacts**

Mark P6 as `local_protocol_pack_config_verified_demo_ready_real_integrations_blocked`, add proof files, add a protocol-pack workstream, and add `npm run p6:gate` to next actions.

- [ ] **Step 2: Run final verification**

Run:

```powershell
npm run p6:gate
npm run ops:status -- --blockers
npm run build
npm test
```

Expected: all commands exit 0; status still shows no open demo blockers and real-PHI blockers separately.

- [ ] **Step 3: Commit**

```powershell
git add package.json src/lib/protocol-packs.ts src/lib/protocol-packs.test.ts server/p6-protocol-pack-gate.ts server/p6-protocol-pack-gate.test.ts scripts/rhtp-p6-protocol-pack-gate.ts docs/ops/rhtp-release-ledger.json docs/ops/RHTP-DEPLOYMENT-CONTROL.md docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md docs/ops/RHTP-FEATURE-FLAGS.md docs/ops/red-team-results/2026-07-04-p6-protocol-pack-gate.md docs/superpowers/plans/2026-07-04-p6-protocol-packs-plan.md
git commit -m "feat: add p6 protocol pack gate"
```
