# Public Preview Preflight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local no-PHI public-preview preflight that names push/link/flag blockers before a public deployed URL is verified.

**Architecture:** Keep the local release gate separate from public preview verification. Add a pure preflight module with injectable git/link state, a CLI wrapper that reads the live checkout, and update the stakeholder packet/status docs to route deploy handoff through the preflight.

**Tech Stack:** TypeScript, Vitest, tsx, existing release-packet and deploy-status patterns.

## Global Constraints

- The stakeholder prototype remains no-PHI and synthetic/local seed data only.
- Do not run public preview verification without a deployed HTTPS URL and Vercel deployment id.
- Do not push unless explicitly requested.
- The preflight may fail in the current checkout; failure should explain the missing external prerequisites.

---

### Task 1: Public Preview Preflight Gate

**Files:**
- Create: `server/public-preview-preflight.ts`
- Create: `server/public-preview-preflight.test.ts`
- Create: `scripts/rhtp-public-preview-preflight.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `currentProofRung`, git push/dirty/upstream state, `.vercel/project.json`, and `RHTP_REAL_PHI`.
- Produces: `runPublicPreviewPreflight(input)` and `npm run preview:preflight`.

- [x] **Step 1: Write failing tests**

Run: `npx vitest run server/public-preview-preflight.test.ts`

Expected: FAIL because `server/public-preview-preflight.ts` does not exist.

- [x] **Step 2: Implement preflight and script**

Cases:
- local release rung is `local_release_gate_verified_no_real_phi`
- `RHTP_REAL_PHI` is off/unset
- working tree is clean
- branch has an upstream
- no local commits are ahead of upstream
- `.vercel/project.json` is present and valid

- [x] **Step 3: Verify**

Run: `npx vitest run server/public-preview-preflight.test.ts`

Expected: PASS.

### Task 2: Handoff And Ledger Wiring

**Files:**
- Modify: `server/stakeholder-release-packet.ts`
- Modify: `server/stakeholder-release-packet.test.ts`
- Modify: `scripts/rhtp-status.ts`
- Modify: `scripts/rhtp-status.test.ts`
- Modify: `docs/ops/rhtp-release-ledger.json`
- Modify: `docs/ops/RHTP-DEPLOYMENT-CONTROL.md`
- Modify: `docs/ops/RHTP-DEPLOYMENT-RUNBOOK.md`
- Modify: `docs/ops/RHTP-DEPLOY-RECEIPTS.md`

**Interfaces:**
- Consumes: new `preview:preflight` command.
- Produces: deploy ladder and stakeholder handoff that route through preflight before public URL verification.

- [x] **Step 1: Write failing packet/status tests**

Run: `npx vitest run server/stakeholder-release-packet.test.ts scripts/rhtp-status.test.ts`

Expected: FAIL because packet/status output does not include `npm run preview:preflight`.

- [x] **Step 2: Wire packet, status, ledger, and docs**

Add `npm run preview:preflight` between `npm run release:gate` and public deploy verification. Keep it out of `release:gate` because it depends on external push/link state.

- [x] **Step 3: Verify**

Run: `npx vitest run scripts/rhtp-status.test.ts server/public-preview-preflight.test.ts server/stakeholder-release-packet.test.ts`

Expected: PASS.
