import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { seed, type SeedState } from '../src/data/seed'
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

function normalizeSeedState(data: SeedState): SeedState {
  return {
    ...data,
    dataSources: data.dataSources ?? seed.dataSources,
    sourceFacts: data.sourceFacts.map((fact) => ({
      ...fact,
      patientConfirmed: fact.patientConfirmed ?? false,
      navigatorOverridden: fact.navigatorOverridden ?? false,
    })),
    patientIdentities: data.patientIdentities ?? [],
    voiceSessions: data.voiceSessions ?? [],
    transcriptSegments: data.transcriptSegments ?? [],
    toolCalls: data.toolCalls ?? [],
    ruleGapTickets: data.ruleGapTickets ?? [],
    opsAlerts: data.opsAlerts ?? [],
    asyncAccessTokens: data.asyncAccessTokens ?? [],
    breakGlassAccesses: data.breakGlassAccesses ?? [],
  }
}

function normalizeBackendState(state: BackendState): BackendState {
  return {
    ...state,
    data: normalizeSeedState(state.data),
  }
}

export function createFileStateStore(filePath: string): StateStore {
  const save = async (state: BackendState): Promise<void> => {
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, JSON.stringify(state, null, 2), 'utf8')
  }

  return {
    async load() {
      try {
        const raw = await readFile(filePath, 'utf8')
        return normalizeBackendState(JSON.parse(raw) as BackendState)
      } catch (error) {
        const fileError = error as NodeJS.ErrnoException
        if (fileError.code === 'ENOENT') {
          return createInitialBackendState()
        }

        throw error
      }
    },
    save,
    async reset() {
      const state = createInitialBackendState()
      await save(state)
      return state
    },
  }
}
