import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import packageJson from '../package.json'
import { localReleaseGateCommands, validateLocalReleaseGate, type LocalReleaseGateCommand } from '../server/local-release-gate'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageScripts = packageJson.scripts as Record<string, string>

function npmInvocation(): { command: string; prefixArgs: string[] } {
  if (process.platform !== 'win32') return { command: 'npm', prefixArgs: [] }

  return {
    command: process.execPath,
    prefixArgs: [resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')],
  }
}

function printValidation(): boolean {
  const report = validateLocalReleaseGate({ packageScripts })
  console.log('RHTP local no-PHI release gate')
  console.log(`Validation: ${report.summary.passed}/${report.summary.total}`)
  for (const testCase of report.cases) {
    console.log(`- ${testCase.id}: ${testCase.ok ? 'pass' : 'fail'} (${testCase.detail})`)
  }

  return report.summary.ok
}

function tail(value: string): string {
  const lines = value.trim().split(/\r?\n/u).filter(Boolean)
  return lines.slice(-40).join('\n')
}

function runNpmScript(command: LocalReleaseGateCommand): boolean {
  const npm = npmInvocation()
  const args = [...npm.prefixArgs, 'run', command.script, ...(command.args ?? [])]
  const result = spawnSync(npm.command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 1024 * 1024 * 20,
  })

  if (result.error) {
    console.log(`- ${command.id}: fail (${result.error.message})`)
    return false
  }

  if (result.status !== 0) {
    console.log(`- ${command.id}: fail (${command.script})`)
    const output = [tail(result.stdout), tail(result.stderr)].filter(Boolean).join('\n')
    if (output.length > 0) console.log(output)
    return false
  }

  console.log(`- ${command.id}: pass (${command.script})`)
  return true
}

function main(): void {
  if (!printValidation()) {
    process.exitCode = 1
    return
  }

  let passed = 0
  for (const command of localReleaseGateCommands) {
    if (!runNpmScript(command)) {
      process.exitCode = 1
      console.log(`Commands: ${passed}/${localReleaseGateCommands.length}`)
      return
    }
    passed += 1
  }

  console.log(`Commands: ${passed}/${localReleaseGateCommands.length}`)
}

main()
