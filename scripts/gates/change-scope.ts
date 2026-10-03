import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { isMain } from './cli.ts'

/**
 * 把改动文件清单映射为最小检查命令集(只建议,不执行)。
 * @param files 相对仓库根的改动文件路径
 * @returns 建议命令,顺序稳定且去重
 */
export function recommend(files: string[]): string[] {
  const cmds: string[] = []
  const pkgs = [...new Set(files.filter((f) => f.startsWith('packages/')).map((f) => f.split('/')[1]))]
  for (const pkg of pkgs) if (pkg) cmds.push(`pnpm exec vitest run packages/${pkg}`)

  if (files.some((f) => f.startsWith('scripts/'))) cmds.push('pnpm run verify && pnpm run test')
  if (files.some((f) => f.startsWith('docs/'))) cmds.push('pnpm run verify:docs')
  if (files.some((f) => f.startsWith('.agents/notes/'))) cmds.push('pnpm run verify:notes')
  if (files.some((f) => f.startsWith('.github/') || f === 'lefthook.yml' || f === 'AGENTS.md')) {
    cmds.push('pnpm run verify')
  }
  // typecheck 只由包内 TS 改动触发;scripts 改动已升级为全量回归,docs 与笔记不涉及类型。
  if (files.some((f) => f.startsWith('packages/') && f.endsWith('.ts'))) cmds.push('pnpm run typecheck')
  return [...new Set(cmds)]
}

function refExists(ref: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--verify', ref], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function resolveBase(): string {
  for (const ref of ['origin/main', 'main']) {
    if (refExists(ref)) return ref
  }
  return ''
}

/** 读取命令行 --base <ref> 显式基线;未提供或缺值时为空串,回退自动探测。 */
function explicitBase(): string {
  const argv = process.argv.slice(2)
  const i = argv.indexOf('--base')
  return i >= 0 ? (argv[i + 1] ?? '') : ''
}

function changedFiles(base: string): string[] {
  try {
    return execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .split('\n')
      .filter(Boolean)
  } catch {
    return []
  }
}

if (isMain(import.meta.url)) {
  const base = explicitBase() || resolveBase()
  if (!base) {
    console.log('找不到 origin/main 或 main 基线;可用 --base <ref> 指定,或先创建分支')
    process.exit(0)
  }
  const files = changedFiles(base)
  console.log(`本次改动(基线 ${base},共 ${files.length} 个文件):`)
  for (const f of files) console.log(`  ${f}`)
  const cmds = recommend(files)
  if (cmds.length === 0) {
    console.log('无需本地检查(全量由 CI 兜底)')
  } else {
    console.log('建议运行(最小检查集;全量由 CI 兜底):')
    for (const c of cmds) console.log(`  ${c}`)
  }
}
