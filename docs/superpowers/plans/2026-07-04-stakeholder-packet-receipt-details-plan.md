# Stakeholder Packet Receipt Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the stakeholder release packet show the latest public preview receipt details once a receipt exists.

**Architecture:** Reuse the existing deploy receipt JSONL parser in `server/deploy-receipt-log.ts`. Add receipt details to the packet model and render them in the handoff markdown without changing the no-PHI prototype boundary.

**Tech Stack:** TypeScript, Vitest, existing `tsx` release-packet script.

## Global Constraints

- No real PHI: stakeholder packet remains a no-real-patient-data prototype handoff.
- Do not claim public deployment unless a preview receipt exists.
- Do not push or deploy from this slice.
- Keep the real-PHI pilot blocked and out of scope for stakeholder demo proof.

---

### Task 1: Packet Receipt Details

**Files:**
- Modify: `server/stakeholder-release-packet.test.ts`
- Modify: `server/stakeholder-release-packet.ts`
- Modify: `scripts/rhtp-stakeholder-release-packet.ts`

**Interfaces:**
- Consumes: `PreviewDeploymentReceipt`, `latestPreviewDeploymentReceipt`, and `summarizePreviewDeploymentReceipt`.
- Produces: `StakeholderReleasePacket.publicPreviewReceiptSummary`.

- [x] **Step 1: Write the failing packet test**

Run: `npm test -- server/stakeholder-release-packet.test.ts`

Expected: FAIL because packet markdown does not include preview URL, deployment id, commit, and verification time.

- [x] **Step 2: Implement minimal packet support**

Accept an optional `publicPreviewReceipt`, summarize it with `summarizePreviewDeploymentReceipt`, and render the summary in `renderStakeholderReleasePacketMarkdown`.

- [x] **Step 3: Read latest receipt in the script**

If `docs/ops/RHTP-DEPLOY-RECEIPTS.jsonl` exists, read it and pass `latestPreviewDeploymentReceipt(...)` into `createStakeholderReleasePacket`.

- [x] **Step 4: Verify green**

Run:

```powershell
npm test -- server/stakeholder-release-packet.test.ts server/deploy-receipt-log.test.ts
npm run release:packet
npm run release:gate
```

Expected: all commands exit 0; packet still says missing when no receipt exists.

- [x] **Step 5: Commit**

```powershell
git add server/stakeholder-release-packet.test.ts server/stakeholder-release-packet.ts scripts/rhtp-stakeholder-release-packet.ts docs/superpowers/plans/2026-07-04-stakeholder-packet-receipt-details-plan.md
git commit -m "feat: add preview receipt details to release packet"
```
