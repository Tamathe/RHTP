import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import releaseLedger from '../docs/ops/rhtp-release-ledger.json'
import {
  createStakeholderReleasePacket,
  renderStakeholderReleasePacketMarkdown,
  type ReleaseLedger,
  type ReleasePacketGitState,
} from '../server/stakeholder-release-packet'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultReceiptPath = resolve(rootDir, 'docs/ops/RHTP-DEPLOY-RECEIPTS.jsonl')

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim()
}

function gitState(): ReleasePacketGitState {
  return {
    aheadOfOrigin: Number(git(['rev-list', '--count', 'origin/master..HEAD'])),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    commit: git(['rev-parse', 'HEAD']),
    dirty: git(['status', '--porcelain']).length > 0,
    shortCommit: git(['rev-parse', '--short', 'HEAD']),
  }
}

function outputPath(): string | undefined {
  const value = process.env.RHTP_RELEASE_PACKET_PATH?.trim()
  return value === undefined || value.length === 0 ? undefined : resolve(rootDir, value)
}

const packet = createStakeholderReleasePacket({
  generatedAt: new Date().toISOString(),
  git: gitState(),
  ledger: releaseLedger as ReleaseLedger,
  publicPreviewReceiptExists: existsSync(defaultReceiptPath),
})
const markdown = renderStakeholderReleasePacketMarkdown(packet)
const targetPath = outputPath()

if (targetPath) {
  writeFileSync(targetPath, markdown, 'utf8')
  console.log(`Wrote stakeholder release packet: ${targetPath}`)
} else {
  process.stdout.write(markdown)
}
