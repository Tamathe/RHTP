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
  const save = async (state: BackendState): Promise<void> => {
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, JSON.stringify(state, null, 2), 'utf8')
  }

  return {
    async load() {
      try {
        const raw = await readFile(filePath, 'utf8')
        return JSON.parse(raw) as BackendState
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
