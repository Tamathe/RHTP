import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import releaseLedger from '../docs/ops/rhtp-release-ledger.json'
import {
  runPublicPreviewPreflight,
  type PublicPreviewPreflightGitState,
  type PublicPreviewPreflightLedger,
} from '../server/public-preview-preflight'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vercelProjectPath = resolve(rootDir, '.vercel/project.json')

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim()
}

function optionalGit(args: string[]): string | undefined {
  try {
    const value = git(args)
    return value.length === 0 ? undefined : value
  } catch {
    return undefined
  }
}

function gitState(): PublicPreviewPreflightGitState {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const upstream = optionalGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])
  const aheadOfOrigin =
    upstream === undefined ? 0 : Number(optionalGit(['rev-list', '--count', `${upstream}..HEAD`]) ?? '0')

  return {
    aheadOfOrigin,
    branch,
    dirty: git(['status', '--porcelain']).length > 0,
    hasUpstream: upstream !== undefined,
  }
}

function vercelProjectLinked(): boolean {
  if (!existsSync(vercelProjectPath)) return false

  try {
    const parsed = JSON.parse(readFileSync(vercelProjectPath, 'utf8')) as Partial<Record<'orgId' | 'projectId', unknown>>
    return typeof parsed.orgId === 'string' && parsed.orgId.length > 0 && typeof parsed.projectId === 'string' && parsed.projectId.length > 0
  } catch {
    return false
  }
}

function main(): void {
  const report = runPublicPreviewPreflight({
    git: gitState(),
    ledger: releaseLedger as PublicPreviewPreflightLedger,
    vercelProjectLinked: vercelProjectLinked(),
  })

  console.log('RHTP public preview preflight')
  console.log(`Cases: ${report.summary.passed}/${report.summary.total}`)
  for (const testCase of report.cases) {
    console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
  }

  if (!report.summary.ok) {
    process.exitCode = 1
  }
}

main()
