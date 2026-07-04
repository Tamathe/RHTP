import { spawn, type ChildProcess } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runStaticPreviewGate } from '../server/static-preview-gate'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const viteBin = resolve(rootDir, 'node_modules/vite/bin/vite.js')
const host = '127.0.0.1'
const preferredPort = Number(process.env.RHTP_PREVIEW_PORT ?? '4174')

interface VercelConfig {
  rewrites?: Array<{
    source?: string
    destination?: string
  }>
}

function printReport(responseUrl: string, report: ReturnType<typeof runStaticPreviewGate>): void {
  console.log('RHTP static preview smoke gate')
  console.log(`URL: ${responseUrl}`)
  console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
  for (const testCase of report.cases) {
    console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
  }
}

async function isPortOpen(port: number): Promise<boolean> {
  return await new Promise((resolveOpen) => {
    const server = createServer()
    server.once('error', () => resolveOpen(false))
    server.listen(port, host, () => {
      server.close(() => resolveOpen(true))
    })
  })
}

async function findOpenPort(startPort: number): Promise<number> {
  for (let offset = 0; offset < 20; offset += 1) {
    const candidate = startPort + offset
    if (await isPortOpen(candidate)) return candidate
  }

  throw new Error(`No open preview port found from ${startPort} to ${startPort + 19}`)
}

async function waitForPreview(url: string): Promise<Response> {
  const deadline = Date.now() + 15_000
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      return response
    } catch (error) {
      lastError = error
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250))
    }
  }

  throw new Error(`Static preview did not respond at ${url}: ${String(lastError)}`)
}

function stopPreview(preview: ChildProcess): void {
  if (preview.killed) return
  preview.kill()
}

async function main(): Promise<void> {
  const port = await findOpenPort(preferredPort)
  const url = `http://${host}:${port}/`
  const preview = spawn(process.execPath, [viteBin, 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd: rootDir,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const previewLogs: string[] = []

  preview.stdout.on('data', (chunk: Buffer) => previewLogs.push(chunk.toString()))
  preview.stderr.on('data', (chunk: Buffer) => previewLogs.push(chunk.toString()))

  try {
    const response = await waitForPreview(url)
    const responseBody = await response.text()
    const vercelConfig = JSON.parse(readFileSync(resolve(rootDir, 'vercel.json'), 'utf8')) as VercelConfig
    const report = runStaticPreviewGate({
      responseBody,
      responseStatus: response.status,
      vercelConfig,
    })

    printReport(response.url, report)

    if (!report.summary.ok) {
      process.exitCode = 1
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    if (previewLogs.length > 0) console.error(previewLogs.join('').trim())
    process.exitCode = 1
  } finally {
    stopPreview(preview)
  }
}

await main()
