import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { isMain } from './cli.ts'

export type Mode = 'all' | 'fast' | 'docs' | 'notes'
export interface GateEntry {
  name: string
  modes: Exclude<Mode, 'all'>[]
}

/** 门禁注册表:新增 verify-*.ts 必须在此登记,否则未注册自检报红。 */
export const REGISTRY: GateEntry[] = [
  { name: 'verify-symlink', modes: ['fast'] },
  { name: 'verify-agent-note-format', modes: ['fast', 'notes'] },
  { name: 'verify-archived-agent-notes', modes: ['notes'] },
  { name: 'verify-doc-budgets', modes: ['docs'] },
]

/** 按模式选择要执行的门禁名(all = 全部注册门禁)。 */
export function selectGates(mode: Mode, registry: GateEntry[]): string[] {
  if (mode === 'all') return registry.map((g) => g.name)
  return registry.filter((g) => g.modes.includes(mode)).map((g) => g.name)
}

/** 反向扫描:存在但未注册的 verify-* 脚本 = 没有接线的门禁。 */
export function findUnregistered(gatesFiles: string[], registry: GateEntry[]): string[] {
  const registered = new Set(registry.map((g) => `${g.name}.ts`))
  return gatesFiles.filter((f) => /^verify-.*\.ts$/.test(f) && !f.endsWith('.test.ts') && !registered.has(f))
}

function parseMode(argv: string[]): Mode {
  const i = argv.indexOf('--mode')
  const value = i >= 0 ? argv[i + 1] : 'all'
  if (value === 'all' || value === 'fast' || value === 'docs' || value === 'notes') return value
  console.error(`未知模式 ${value};可用:all / fast / docs / notes`)
  process.exit(1)
}

if (isMain(import.meta.url)) {
  const mode = parseMode(process.argv)

  const unregistered = findUnregistered(readdirSync('scripts/gates'), REGISTRY)
  if (unregistered.length > 0) {
    for (const f of unregistered) {
      console.error(`✗ scripts/gates/${f} 存在但未注册进 run-gates 的 REGISTRY;未注册的门禁永远不会跑`)
    }
    process.exit(1)
  }

  const selected = selectGates(mode, REGISTRY)
  let failed = 0
  for (const name of selected) {
    const result = spawnSync('pnpm', ['exec', 'tsx', `scripts/gates/${name}.ts`], { stdio: 'inherit' })
    if (result.status !== 0) failed++
  }
  console.log(
    failed === 0
      ? `✓ run-gates(${mode}):${selected.length} 项全过`
      : `✗ run-gates(${mode}):${failed} 项未通过`,
  )
  process.exit(failed === 0 ? 0 : 1)
}
