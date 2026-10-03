import { execSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { isMain } from './gates/cli.ts'

const TEXT_EXT = new Set(['.json', '.md', '.yaml', '.yml', '.ts'])
const SKIP_DIR = new Set(['node_modules', '.git', 'lib', 'dist'])
const TEMPLATE_SCOPE = '@tmpl'

/** 把文本中的旧包前缀整体替换为新前缀。 */
export function renameScope(content: string, from: string, to: string): string {
  return content.split(`${from}/`).join(`${to}/`)
}

/** 收集仓库内全部文本文件路径(跳过依赖与构建产物;符号链接不遍历——接线不是内容,与 walkMd 语义对齐)。 */
export function walkTextFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(entry.name)) continue
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkTextFiles(p))
    else if (TEXT_EXT.has(entry.name.slice(entry.name.lastIndexOf('.')))) out.push(p)
  }
  return out
}

export type SymlinkMode = 'symlink' | 'copy'

/**
 * 确保 CLAUDE.md 指向 AGENTS.md:优先真 symlink,平台不支持时降级为内容副本。
 * verify-symlink 门禁守住"内容同一"这一不变量,副本分叉会变红。
 */
export function ensureClaudeSymlink(dir: string, forceCopy = false): SymlinkMode {
  const claude = join(dir, 'CLAUDE.md')
  const agents = join(dir, 'AGENTS.md')
  rmSync(claude, { force: true })
  if (forceCopy) {
    copyFileSync(agents, claude)
    return 'copy'
  }
  try {
    symlinkSync('AGENTS.md', claude)
    return 'symlink'
  } catch {
    copyFileSync(agents, claude)
    return 'copy'
  }
}

/**
 * 重建 .claude/skills 接线:每个技能一个指向 .agents/skills/<name> 的 symlink;
 * 平台不支持时降级为目录副本。技能内容的唯一 home 始终是 .agents/skills/。
 */
export function repairSkillsWiring(dir: string, log: (msg: string) => void, forceCopy = false): void {
  const skillsDir = join(dir, '.agents', 'skills')
  const wiringDir = join(dir, '.claude', 'skills')
  if (!existsSync(skillsDir)) return
  mkdirSync(wiringDir, { recursive: true })
  let degraded = false
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const link = join(wiringDir, entry.name)
    rmSync(link, { force: true, recursive: true })
    if (forceCopy) {
      cpSync(join(skillsDir, entry.name), link, { recursive: true })
      degraded = true
      continue
    }
    try {
      symlinkSync(`../../.agents/skills/${entry.name}`, link)
    } catch {
      cpSync(join(skillsDir, entry.name), link, { recursive: true })
      degraded = true
    }
  }
  if (degraded) {
    log('   .claude/skills 部分降级为目录副本(symlink 不可用);技能内容以 .agents/skills/ 为唯一 home')
  }
}

export interface BootstrapOptions {
  /** 模板仓库根目录 */
  dir: string
  /** 新包前缀,如 '@acme';默认保持 @tmpl 不改名 */
  scope?: string
  /** 保留示例包(默认 true) */
  keepExample?: boolean
  log?: (msg: string) => void
  /** 命令执行器,测试注入用;默认真实 spawnSync pnpm */
  run?: (args: string[]) => number | null
}

const defaultRun = (args: string[]): number | null => {
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw new Error(`无法执行 pnpm ${args.join(' ')}:${result.error.message}`)
  return result.status
}

/**
 * 模板初始化:改名 → 接线修复 → git init → install(+prepare)→ 门禁自检。
 * 每步响亮失败(中文报错 + 修复路径),绝不静默跳过;重跑幂等。
 */
export async function bootstrap(opts: BootstrapOptions): Promise<void> {
  const { dir, scope = TEMPLATE_SCOPE, keepExample = true } = opts
  const log = opts.log ?? ((m: string) => console.log(m))
  const run = opts.run ?? defaultRun

  log(`① 环境探测:${process.platform},目标 ${dir}`)
  if (!existsSync(join(dir, 'AGENTS.md'))) {
    throw new Error(`${dir} 不是模板仓库(缺 AGENTS.md);请在克隆出的模板根目录运行`)
  }

  log(`② 包前缀:${TEMPLATE_SCOPE}/ → ${scope}/`)
  if (scope !== TEMPLATE_SCOPE) {
    for (const file of walkTextFiles(dir)) {
      const content = readFileSync(file, 'utf8')
      const next = renameScope(content, TEMPLATE_SCOPE, scope)
      if (next !== content) writeFileSync(file, next)
    }
  }

  if (!keepExample && existsSync(join(dir, 'packages', 'example'))) {
    rmSync(join(dir, 'packages', 'example'), { recursive: true, force: true })
    log('③ 已删除示例包 packages/example(docs 与 AGENTS.md 中残留引用可阅读后清理)')
  }

  const mode = ensureClaudeSymlink(dir)
  log(`④ CLAUDE.md:${mode === 'symlink' ? 'symlink 已就位' : '平台不支持,已写内容副本;恢复真 symlink 后内容分叉会被 verify-symlink 抓住'}`)
  repairSkillsWiring(dir, log)

  if (!existsSync(join(dir, '.git'))) {
    execSync('git init -b main', { cwd: dir, stdio: 'ignore' })
    log('⑤ 已 git init;治理先于代码,全部制度文件随首提交入库')
  } else {
    log('⑤ 已有 git 历史,跳过 init')
  }

  log('⑥ pnpm install')
  if (run(['install']) !== 0) {
    throw new Error('pnpm install 失败;检查 node(>=22.19)与 pnpm 版本;修复后重跑 pnpm bootstrap(幂等)')
  }
  if (run(['run', 'prepare']) !== 0) {
    throw new Error('pnpm run prepare 失败(lefthook 钩子安装);可手动重跑 pnpm run prepare')
  }

  log('⑦ 门禁自检(pnpm run verify)')
  if (run(['run', 'verify']) !== 0) {
    throw new Error('门禁未全绿;修复上述违规后重跑 pnpm bootstrap(幂等)')
  }

  log('⑧ 完成。先把 README 首行、package.json 的 name、AGENTS.md 首段的"模板"表述换成你的项目,再走 README「第 1 周」的完整闭环。')
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2)
  const scopeIdx = argv.indexOf('--scope')
  const rawScope = scopeIdx >= 0 ? argv[scopeIdx + 1] : undefined
  if (scopeIdx >= 0 && (rawScope === undefined || !/^@[\w.-]+$/.test(rawScope))) {
    console.error(`--scope 需要 @组织名 形式(如 @acme);收到:${rawScope ?? '(缺值)'}`)
    process.exit(1)
  }
  const keepExample = !argv.includes('--no-example')
  bootstrap({ dir: process.cwd(), scope: rawScope, keepExample }).catch((e: unknown) => {
    console.error(`bootstrap 失败:${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  })
}
