# H2 Async RLS Token Gate Plan

## Goal

Build a local, production-shaped H2 control for the async reasoning lane: every async read must carry a gateway-minted token scoped to one patient and one or more concrete protocol packs, with short TTL, audit events, and explicit job-complete revocation.

## Scope

- Add a persisted local `asyncAccessTokens` state rail that stores only token hashes, never bearer values.
- Add server actions to mint, read with, and revoke async access tokens.
- Add API routes that act as the local gateway for async token minting and patient-context reads.
- Add `npm run async:gate` as the operator proof command.
- Update the real-PHI gate docs and release ledger without claiming production RLS is closed.

## Acceptance

- Matching patient and pack reads return only that patient's context.
- Cross-patient, cross-pack, expired, revoked, unknown-token, and wildcard broad-grant attempts are blocked and audited.
- H2 is recorded as local-control-verified only; real-PHI remains blocked until the same contract is backed by production consent repository and database RLS policies.
