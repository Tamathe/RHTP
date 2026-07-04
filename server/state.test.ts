import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

  it('hydrates older persisted demo state with new realtime voice arrays and tool calls', async () => {
    const filePath = await tempStatePath()
    const store = createFileStateStore(filePath)
    const legacyState = createInitialBackendState() as unknown as {
      data: Record<string, unknown>
    }
    delete legacyState.data.voiceSessions
    delete legacyState.data.transcriptSegments
    delete legacyState.data.toolCalls
    delete legacyState.data.asyncAccessTokens

    await writeFile(filePath, JSON.stringify(legacyState, null, 2), 'utf8')
    const loaded = await store.load()

    expect(loaded.data.voiceSessions).toEqual([])
    expect(loaded.data.transcriptSegments).toEqual([])
    expect(loaded.data.toolCalls).toEqual([])
    expect(loaded.data.asyncAccessTokens).toEqual([])
  })

  it('hydrates older persisted demo state with identity rows and source fact confirmation fields', async () => {
    const filePath = await tempStatePath()
    const store = createFileStateStore(filePath)
    const legacyState = createInitialBackendState() as unknown as {
      data: Record<string, unknown>
    }
    delete legacyState.data.patientIdentities
    legacyState.data.sourceFacts = (
      legacyState.data.sourceFacts as Array<Record<string, unknown>>
    ).map((fact) => {
      const copy = { ...fact }
      delete copy.patientConfirmed
      delete copy.navigatorOverridden
      delete copy.fhirRef
      return copy
    })

    await writeFile(filePath, JSON.stringify(legacyState, null, 2), 'utf8')
    const loaded = await store.load()

    expect(loaded.data.patientIdentities).toEqual([])
    for (const fact of loaded.data.sourceFacts) {
      expect(fact.patientConfirmed).toBe(false)
      expect(fact.navigatorOverridden).toBe(false)
    }
  })
})
