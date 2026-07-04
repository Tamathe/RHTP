# RHTP Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the P1 backend foundation for the patient-owned, EMR-adjacent retinopathy wedge: persistent state, protocol-safe actions, navigator queue API, and audit/event logging.

**Architecture:** Keep the current React prototype intact while adding a small TypeScript backend beside it. The backend stores typed state in a local JSON file, reuses the existing protocol and safety helpers, exposes pure route handlers for tests, and wraps them in a Node HTTP server for local API use. No real PHI, HIE, claims, EMR, or OpenAI voice session is added in this phase.

**Tech Stack:** TypeScript 5.7 strict mode, Node built-in `http` and `fs/promises`, `tsx` for local backend execution, Vitest 4, existing React/Vite frontend.

## Global Constraints

- Work only in `C:\Projects\rhtp-prototype`.
- P1 remains diabetic-retinopathy only.
- P1 uses seed/demo data only; do not add real PHI, real HIE, real claims feeds, real EMR integration, or real OpenAI voice sessions.
- Keep the current patient-facing app working while adding backend rails.
- Backend state must be strongly typed; do not use `any`.
- All protocol-changing actions must write protocol events and audit events.
- Sandy-like backend actions may explain, record patient replies, collect barriers, queue navigator work, and block red flags; they may not diagnose, change medications, reassure red flags, or close gaps without review.
- Navigator queue is the first returned-information API surface.
- Use TDD: write failing tests first, implement the smallest passing change, then commit.

---

## File Structure

- `package.json`: add backend scripts and local TypeScript runtime dependencies.
- `tsconfig.json`: include backend/server files in strict type checking and add Node test types.
- `server/types.ts`: backend state, audit event, route result, and request DTO types.
- `server/state.ts`: load/save/reset JSON-backed backend state from the existing seed model.
- `server/audit.ts`: append audit events for reads, protocol actions, queue actions, and failures.
- `server/actions.ts`: protocol-safe backend actions for voice session start, patient reply capture, and navigator completion.
- `server/routes.ts`: pure request router used by tests and the HTTP entrypoint.
- `server/index.ts`: Node HTTP server wrapper.
- `server/*.test.ts`: focused tests for persistence, audit, actions, and routes.
- `server/data/.gitkeep`: keep the local persistence folder in git without committing generated state.
- `.gitignore`: ignore generated backend JSON state.
- `docs/superpowers/sprints/2026-07-03-rhtp-production-architecture-sprint.md`: mark P1 active/verified as work progresses.

---

### Task 1: Add Backend Persistence And Audit Primitives

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `.gitignore`
- Create: `server/types.ts`
- Create: `server/state.ts`
- Create: `server/audit.ts`
- Create: `server/state.test.ts`
- Create: `server/audit.test.ts`
- Create: `server/data/.gitkeep`

**Interfaces:**
- Consumes: `SeedState` and `seed` from `src/data/seed.ts`
- Produces: `BackendState`, `AuditEvent`, `createInitialBackendState()`, `createFileStateStore(path)`, `appendAuditEvent(state, input)`

- [ ] **Step 1: Add failing persistence tests**

Create `server/state.test.ts`:

```ts
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import { createFileStateStore, createInitialBackendState } from './state'

const tempDirs: string[] = []

async function tempStatePath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'rhtp-state-'))
  tempDirs.push(dir)
  return join(dir, 'state.json')
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('backend state persistence', () => {
  it('creates initial backend state from the trusted seed bundle', () => {
    const state = createInitialBackendState()

    expect(state.schemaVersion).toBe(1)
    expect(state.data.patients.some((patient) => patient.id === HERO_ID)).toBe(true)
    expect(state.data.consents.find((consent) => consent.patientId === HERO_ID)?.status).toBe('active')
    expect(state.auditEvents).toHaveLength(0)
  })

  it('loads seed state when no persisted state exists, then saves changes', async () => {
    const filePath = await tempStatePath()
    const store = createFileStateStore(filePath)

    const loaded = await store.load()
    loaded.data.voiceTurns.push({
      id: 'voice_test',
      patientId: HERO_ID,
      speaker: 'sandy',
      text: 'Persisted hello',
      createdAt: '2026-07-04T09:00:00',
      mode: 'voice',
      safety: 'normal',
    })

    await store.save(loaded)
    const reloaded = await store.load()

    expect(reloaded.data.voiceTurns.at(-1)?.text).toBe('Persisted hello')
  })
})
```

- [ ] **Step 2: Add failing audit tests**

Create `server/audit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import { appendAuditEvent } from './audit'
import { createInitialBackendState } from './state'

describe('appendAuditEvent', () => {
  it('records actor, action, patient, and source references without mutating the input state', () => {
    const state = createInitialBackendState()
    const updated = appendAuditEvent(state, {
      actor: 'sandy',
      action: 'voice_reply_recorded',
      patientId: HERO_ID,
      outcome: 'allowed',
      sourceIds: ['fact_ruth_gap_claims'],
      detail: 'Patient reported a ride barrier',
    })

    expect(state.auditEvents).toHaveLength(0)
    expect(updated.auditEvents).toEqual([
      expect.objectContaining({
        actor: 'sandy',
        action: 'voice_reply_recorded',
        patientId: HERO_ID,
        outcome: 'allowed',
        sourceIds: ['fact_ruth_gap_claims'],
      }),
    ])
  })
})
```

- [ ] **Step 3: Verify red**

Run: `npm test -- server/state.test.ts server/audit.test.ts`

Expected: FAIL because `server/state.ts`, `server/audit.ts`, and backend types do not exist.

- [ ] **Step 4: Add dependencies and TypeScript coverage**

Run: `npm install -D tsx @types/node`

Modify `package.json` scripts:

```json
"server:dev": "tsx server/index.ts",
"server:test": "vitest run server"
```

Modify `tsconfig.json`:

```json
"types": ["vitest/globals", "@testing-library/jest-dom", "node"],
"include": ["src", "server", "vite.config.ts"]
```

Modify `.gitignore`:

```gitignore
server/data/*.json
```

- [ ] **Step 5: Add backend types and state store**

Create `server/types.ts`:

```ts
import type { SeedState } from '../src/data/seed'

export type AuditActor = 'patient' | 'sandy' | 'navigator' | 'system'
export type AuditOutcome = 'allowed' | 'blocked' | 'failed'

export interface AuditEvent {
  id: string
  createdAt: string
  actor: AuditActor
  action: string
  outcome: AuditOutcome
  patientId?: string
  sourceIds: string[]
  detail: string
}

export interface BackendState {
  schemaVersion: 1
  updatedAt: string
  data: SeedState
  auditEvents: AuditEvent[]
}

export interface StateStore {
  load: () => Promise<BackendState>
  save: (state: BackendState) => Promise<void>
  reset: () => Promise<BackendState>
}

export interface RouteResponse<T> {
  status: number
  body: T
}
```

Create `server/state.ts`:

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { seed } from '../src/data/seed'
import type { BackendState, StateStore } from './types'

const NOW = '2026-07-04T09:00:00'

export function createInitialBackendState(): BackendState {
  return {
    schemaVersion: 1,
    updatedAt: NOW,
    data: structuredClone(seed),
    auditEvents: [],
  }
}

export function createFileStateStore(filePath: string): StateStore {
  return {
    async load() {
      try {
        const raw = await readFile(filePath, 'utf8')
        return JSON.parse(raw) as BackendState
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          return createInitialBackendState()
        }

        throw error
      }
    },
    async save(state) {
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, JSON.stringify(state, null, 2), 'utf8')
    },
    async reset() {
      const state = createInitialBackendState()
      await this.save(state)
      return state
    },
  }
}
```

Create `server/audit.ts`:

```ts
import type { AuditActor, AuditOutcome, BackendState } from './types'

interface AppendAuditEventInput {
  actor: AuditActor
  action: string
  outcome: AuditOutcome
  detail: string
  patientId?: string
  sourceIds?: string[]
}

let auditCounter = 0

const now = (): string => '2026-07-04T09:00:00'

export function appendAuditEvent(state: BackendState, input: AppendAuditEventInput): BackendState {
  return {
    ...state,
    updatedAt: now(),
    auditEvents: [
      ...state.auditEvents,
      {
        id: `audit_${++auditCounter}`,
        createdAt: now(),
        actor: input.actor,
        action: input.action,
        outcome: input.outcome,
        patientId: input.patientId,
        sourceIds: input.sourceIds ?? [],
        detail: input.detail,
      },
    ],
  }
}
```

Create `server/data/.gitkeep`.

- [ ] **Step 6: Verify green and commit**

Run: `npm test -- server/state.test.ts server/audit.test.ts`

Expected: PASS.

Then commit:

```bash
git add package.json package-lock.json tsconfig.json .gitignore server
git commit -m "feat: add backend persistence rail"
```

---

### Task 2: Add Protocol-Safe Backend Actions

**Files:**
- Create: `server/actions.ts`
- Create: `server/actions.test.ts`

**Interfaces:**
- Consumes: `BackendState`, `appendAuditEvent`, `screenPatientMessage`, `nextProtocolStatus`, `queueReasonForBarrier`, `priorityForQueueReason`
- Produces: `startVoiceSession(state, patientId)`, `recordVoiceReply(state, input)`, `completeNavigatorTask(state, itemId, reviewer)`

- [ ] **Step 1: Add failing backend action tests**

Create `server/actions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import { completeNavigatorTask, recordVoiceReply, startVoiceSession } from './actions'
import { createInitialBackendState } from './state'

describe('backend protocol actions', () => {
  it('starts a Sandy voice session with a protocol event and audit event', () => {
    const updated = startVoiceSession(createInitialBackendState(), HERO_ID)

    expect(updated.data.voiceTurns.at(-1)?.speaker).toBe('sandy')
    expect(updated.data.protocolEvents.at(-1)).toEqual(
      expect.objectContaining({ patientId: HERO_ID, type: 'sandy_explained_gap', status: 'explained' }),
    )
    expect(updated.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ action: 'voice_session_started', outcome: 'allowed' }),
    )
  })

  it('records a patient transportation barrier and creates navigator queue work', () => {
    const started = startVoiceSession(createInitialBackendState(), HERO_ID)
    const updated = recordVoiceReply(started, { patientId: HERO_ID, text: 'I need a ride' })

    expect(updated.data.barriers.at(-1)).toEqual(
      expect.objectContaining({ patientId: HERO_ID, type: 'transportation', reportedVia: 'voice_api' }),
    )
    expect(updated.data.navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({ reason: 'transportation_barrier', priority: 'routine', status: 'open' }),
    )
    expect(updated.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ action: 'voice_reply_recorded', outcome: 'allowed' }),
    )
  })

  it('blocks routine coaching after a red-flag symptom and creates urgent navigator work', () => {
    const redFlagged = recordVoiceReply(createInitialBackendState(), {
      patientId: HERO_ID,
      text: 'I have sudden vision changes',
    })
    const locked = startVoiceSession(redFlagged, HERO_ID)

    expect(redFlagged.data.navigatorQueue.at(-1)).toEqual(
      expect.objectContaining({ reason: 'red_flag_symptom', priority: 'urgent' }),
    )
    expect(locked.data.voiceTurns.at(-1)?.text).toMatch(/cannot continue routine coaching/i)
    expect(locked.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ action: 'voice_session_started', outcome: 'blocked' }),
    )
  })

  it('lets a navigator complete returned work with review provenance', () => {
    const queued = recordVoiceReply(createInitialBackendState(), {
      patientId: HERO_ID,
      text: 'Already completed',
    })
    const itemId = queued.data.navigatorQueue.at(-1)?.id
    if (!itemId) throw new Error('Expected queued item')

    const updated = completeNavigatorTask(queued, itemId, 'nav_dana')

    expect(updated.data.navigatorQueue.find((item) => item.id === itemId)?.status).toBe('done')
    expect(updated.data.protocolEvents.at(-1)).toEqual(
      expect.objectContaining({ type: 'navigator_reviewed', actor: 'navigator' }),
    )
    expect(updated.auditEvents.at(-1)).toEqual(
      expect.objectContaining({ actor: 'navigator', action: 'navigator_queue_completed' }),
    )
  })
})
```

- [ ] **Step 2: Verify red**

Run: `npm test -- server/actions.test.ts`

Expected: FAIL because `server/actions.ts` does not exist.

- [ ] **Step 3: Implement backend actions**

Create `server/actions.ts` with pure functions that:

```ts
import { appendAuditEvent } from './audit'
import { screenPatientMessage } from '../src/lib/safety'
import { nextProtocolStatus, priorityForQueueReason, queueReasonForBarrier } from '../src/lib/retinopathy-protocol'
import type { BackendState } from './types'
import type { BarrierType, NavigatorQueueReason, ProtocolActor, ProtocolEvent, ProtocolEventType, ResultOutcome } from '../src/types'
```

The module must define:

```ts
export interface RecordVoiceReplyInput {
  patientId: string
  text: string
}

export function startVoiceSession(state: BackendState, patientId: string): BackendState
export function recordVoiceReply(state: BackendState, input: RecordVoiceReplyInput): BackendState
export function completeNavigatorTask(state: BackendState, itemId: string, reviewer: string): BackendState
```

Use these exact rules:

- `startVoiceSession` appends a `sandy_explained_gap` protocol event unless the patient has an open red flag.
- If an open red flag exists, append only a Sandy lock voice turn and a blocked audit event.
- `recordVoiceReply` always appends the patient voice turn.
- Red flags create `red_flag_reported`, an open `RedFlagEvent`, an urgent `red_flag_symptom` navigator queue item, and an allowed audit event.
- Barriers create `barrier_reported`, a `Barrier`, a navigator queue item mapped by `queueReasonForBarrier`, and an allowed audit event.
- Off-protocol questions create a fallback Sandy reply and an allowed audit event with detail naming the fallback.
- `completeNavigatorTask` marks the item done, appends `navigator_reviewed`, and audits `navigator_queue_completed`.

- [ ] **Step 4: Verify green and commit**

Run: `npm test -- server/actions.test.ts`

Expected: PASS.

Then commit:

```bash
git add server/actions.ts server/actions.test.ts
git commit -m "feat: add backend protocol actions"
```

---

### Task 3: Add Navigator Queue And Protocol API Routes

**Files:**
- Create: `server/routes.ts`
- Create: `server/routes.test.ts`
- Create: `server/index.ts`

**Interfaces:**
- Consumes: `StateStore`, backend action functions
- Produces: `handleApiRequest(store, method, path, body)`, HTTP API endpoints:
  - `GET /api/health`
  - `GET /api/patients/:patientId/context`
  - `GET /api/navigator/queue`
  - `POST /api/voice/:patientId/start`
  - `POST /api/voice/:patientId/reply`
  - `POST /api/navigator/queue/:itemId/complete`
  - `GET /api/audit`
  - `POST /api/reset`

- [ ] **Step 1: Add failing route tests**

Create `server/routes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { HERO_ID } from '../src/data/seed'
import { handleApiRequest } from './routes'
import { createInitialBackendState } from './state'
import type { BackendState, StateStore } from './types'

function createMemoryStore(initial: BackendState = createInitialBackendState()): StateStore {
  let state = initial
  return {
    async load() {
      return state
    },
    async save(next) {
      state = next
    },
    async reset() {
      state = createInitialBackendState()
      return state
    },
  }
}

describe('handleApiRequest', () => {
  it('returns health without touching patient state', async () => {
    const response = await handleApiRequest(createMemoryStore(), 'GET', '/api/health')

    expect(response).toEqual({ status: 200, body: { ok: true, service: 'rhtp-backend' } })
  })

  it('returns minimum trusted context for a patient', async () => {
    const response = await handleApiRequest(createMemoryStore(), 'GET', `/api/patients/${HERO_ID}/context`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.objectContaining({
        patient: expect.objectContaining({ id: HERO_ID }),
        consent: expect.objectContaining({ status: 'active' }),
        sourceFacts: expect.arrayContaining([expect.objectContaining({ sourceKind: 'claims' })]),
      }),
    )
  })

  it('starts voice outreach and returns updated patient context', async () => {
    const store = createMemoryStore()
    const response = await handleApiRequest(store, 'POST', `/api/voice/${HERO_ID}/start`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.objectContaining({
        voiceTurns: expect.arrayContaining([expect.objectContaining({ speaker: 'sandy' })]),
      }),
    )
  })

  it('records voice reply and exposes navigator queue work', async () => {
    const store = createMemoryStore()
    await handleApiRequest(store, 'POST', `/api/voice/${HERO_ID}/reply`, { text: 'I need a ride' })
    const response = await handleApiRequest(store, 'GET', '/api/navigator/queue')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason: 'transportation_barrier' })]),
    )
  })

  it('completes navigator queue work and exposes audit events', async () => {
    const store = createMemoryStore()
    const reply = await handleApiRequest(store, 'POST', `/api/voice/${HERO_ID}/reply`, { text: 'Already completed' })
    const itemId = reply.body.navigatorQueue.at(-1)?.id
    if (!itemId) throw new Error('Expected queued item')

    const completed = await handleApiRequest(store, 'POST', `/api/navigator/queue/${itemId}/complete`, {
      reviewer: 'nav_dana',
    })
    const audit = await handleApiRequest(store, 'GET', '/api/audit')

    expect(completed.status).toBe(200)
    expect(completed.body.status).toBe('done')
    expect(audit.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'navigator_queue_completed' })]),
    )
  })

  it('returns typed errors for unknown routes and invalid payloads', async () => {
    expect(await handleApiRequest(createMemoryStore(), 'GET', '/api/nope')).toEqual({
      status: 404,
      body: { error: 'Route not found' },
    })

    expect(await handleApiRequest(createMemoryStore(), 'POST', `/api/voice/${HERO_ID}/reply`, {})).toEqual({
      status: 400,
      body: { error: 'Voice reply requires text' },
    })
  })
})
```

- [ ] **Step 2: Verify red**

Run: `npm test -- server/routes.test.ts`

Expected: FAIL because `server/routes.ts` does not exist.

- [ ] **Step 3: Implement pure routes**

Create `server/routes.ts` with:

```ts
import { completeNavigatorTask, recordVoiceReply, startVoiceSession } from './actions'
import type { RouteResponse, StateStore } from './types'
```

Define:

```ts
export async function handleApiRequest(
  store: StateStore,
  method: string,
  path: string,
  body: unknown = undefined,
): Promise<RouteResponse<unknown>>
```

Use URL path matching only; do not add Express. The route handler must:

- Return health metadata for `GET /api/health`.
- Return patient, consent, source facts, protocol events, voice turns, red flags, and open navigator queue items for `GET /api/patients/:patientId/context`.
- Return open navigator queue items with patient names and source facts for `GET /api/navigator/queue`.
- Persist and return context for voice start and voice reply endpoints.
- Persist and return the completed queue item for navigator completion.
- Return audit events newest-last for `GET /api/audit`.
- Reset persisted state for `POST /api/reset`.
- Return `{ error: 'Route not found' }` with `404` for unknown routes.

- [ ] **Step 4: Implement HTTP entrypoint**

Create `server/index.ts`:

```ts
import { createServer } from 'node:http'
import { join } from 'node:path'
import { createFileStateStore } from './state'
import { handleApiRequest } from './routes'

const PORT = Number(process.env.PORT ?? 8787)
const store = createFileStateStore(join(process.cwd(), 'server', 'data', 'rhtp-state.json'))

async function readBody(request: Parameters<typeof createServer>[0] extends (request: infer R, response: unknown) => unknown ? R : never): Promise<unknown> {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  return raw.length > 0 ? JSON.parse(raw) : undefined
}

const server = createServer(async (request, response) => {
  try {
    const body = await readBody(request)
    const result = await handleApiRequest(store, request.method ?? 'GET', request.url ?? '/', body)

    response.writeHead(result.status, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
    })
    response.end(JSON.stringify(result.body))
  } catch (error) {
    response.writeHead(500, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown server error' }))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`RHTP backend listening on http://127.0.0.1:${PORT}`)
})
```

If the `readBody` type helper is awkward under strict mode, replace it with an explicitly imported `IncomingMessage` type from `node:http`.

- [ ] **Step 5: Verify green and commit**

Run: `npm test -- server/routes.test.ts`

Expected: PASS.

Then commit:

```bash
git add server/routes.ts server/routes.test.ts server/index.ts
git commit -m "feat: add backend API routes"
```

---

### Task 4: Final Backend Verification And Sprint Update

**Files:**
- Modify: `docs/superpowers/sprints/2026-07-03-rhtp-production-architecture-sprint.md`

**Interfaces:**
- Produces final local proof for P1 backend foundation.

- [ ] **Step 1: Run backend tests**

Run: `npm run server:test`

Expected: all server tests PASS.

- [ ] **Step 2: Run full tests**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build PASS.

- [ ] **Step 4: Start backend and smoke the API**

Run: `npm run server:dev`

Expected: backend listens on `http://127.0.0.1:8787`.

In another terminal:

```bash
curl http://127.0.0.1:8787/api/health
curl http://127.0.0.1:8787/api/patients/pat_ruthann/context
curl -X POST http://127.0.0.1:8787/api/voice/pat_ruthann/reply -H "content-type: application/json" -d "{\"text\":\"I need a ride\"}"
curl http://127.0.0.1:8787/api/navigator/queue
curl http://127.0.0.1:8787/api/audit
```

Expected: health returns `ok: true`, patient context includes consent/source facts, voice reply creates `transportation_barrier`, queue returns that item, and audit includes `voice_reply_recorded`.

- [ ] **Step 5: Update the sprint tracker**

Update the sprint file with:

```md
## Current Phase
Phase 6 - P1 backend foundation verified

## Phase 6 - P1 Backend Foundation
**Status:** done
**Implemented:** JSON-backed backend state, minimum trusted patient context API, voice action API, navigator queue API, and audit/event logging.
**Automated proof:** `npm run server:test`, `npm test`, and `npm run build` passed.
**API proof:** Backend on `http://127.0.0.1:8787` returned health, patient context, navigator queue, and audit; voice reply created transportation-barrier work.

## Next Action
Choose P2 voice integration path: backend-created Realtime sessions, transcript/event capture, and structured navigator summaries.
```

- [ ] **Step 6: Commit verification update**

```bash
git add docs/superpowers/sprints/2026-07-03-rhtp-production-architecture-sprint.md
git commit -m "docs: mark P1 backend verified"
```

---

## Acceptance Checklist

- [ ] Backend state loads from the existing trusted seed bundle.
- [ ] Backend state persists to `server/data/rhtp-state.json`, which is ignored by git.
- [ ] Patient context API returns patient, active consent, source facts, protocol events, voice turns, red flags, and open queue items.
- [ ] Voice start API writes protocol and audit events.
- [ ] Voice reply API creates barrier and red-flag navigator queue work through existing protocol/safety rules.
- [ ] Navigator completion API marks queue items done and records navigator review.
- [ ] Audit API returns action evidence for Sandy, patient, navigator, and system actions.
- [ ] No client API keys, real PHI, real HIE, real claims, or real EMR integration added.
- [ ] Existing P0 UI still builds and tests.
- [ ] `npm run server:test` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.

## Self-Review

- Spec coverage: This plan maps directly to Phase P1: persistent backend, patient/consent/source-fact/protocol-event schema, navigator queue API, and audit/event logging.
- Scope boundary: P2 voice Realtime sessions, transcript summarization, HIE/claims imports, and EMR writeback are explicitly deferred.
- Type consistency: Shared state stays based on `SeedState`; backend additions are wrapped by `BackendState` and `AuditEvent`.
- Placeholder scan: No task depends on undefined future work; routes, payloads, commands, and expected results are concrete.
