import { createServer, type IncomingMessage } from 'node:http'
import { join } from 'node:path'
import { handleApiRequest } from './routes'
import { createFileStateStore } from './state'

const PORT = Number(process.env.PORT ?? 8787)
const store = createFileStateStore(join(process.cwd(), 'server', 'data', 'rhtp-state.json'))

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  return raw.length > 0 ? JSON.parse(raw) : undefined
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
    })
    response.end()
    return
  }

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
