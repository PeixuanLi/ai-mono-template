import { existsSync, lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { join } from 'node:path'
import { isMain, runMain } from './cli.ts'

/**
 * 校验 CLAUDE.md 与 AGENTS.md 内容同一。
 * 不变量:读者从任一入口拿到的规则逐字节一致。symlink(首选,必须精确相对指向 AGENTS.md)或一致副本均可,分叉即违规。
 * @param repoRoot 仓库根目录
 * @returns 中文违规清单,空数组表示通过
 */
export async function check(repoRoot: string): Promise<string[]> {
  const agentsPath = join(repoRoot, 'AGENTS.md')
  const claudePath = join(repoRoot, 'CLAUDE.md')

  if (!existsSync(agentsPath) || !lstatSync(agentsPath).isFile()) {
    return ['AGENTS.md 不存在或不是普通文件;它是全部常驻规则的唯一来源。修复:git checkout -- AGENTS.md']
  }
  if (!existsSync(claudePath)) {
    return ['CLAUDE.md 缺失或悬空;修复:rm -f CLAUDE.md && ln -s AGENTS.md CLAUDE.md']
  }

  const stat = lstatSync(claudePath)
  if (stat.isSymbolicLink()) {
    const target = readlinkSync(claudePath)
    if (target !== 'AGENTS.md') {
      return [`CLAUDE.md 的 symlink 指向 ${target};必须精确指向 AGENTS.md(相对、无目录前缀)`]
    }
    return []
  }
  if (!stat.isFile()) {
    return ['CLAUDE.md 不是普通文件;修复:rm -rf CLAUDE.md && ln -s AGENTS.md CLAUDE.md']
  }

  const agents = readFileSync(agentsPath, 'utf8')
  const claude = readFileSync(claudePath, 'utf8')
  if (agents !== claude) {
    return [
      'CLAUDE.md 是普通文件且与 AGENTS.md 内容分叉;修复:rm -f CLAUDE.md && ln -s AGENTS.md CLAUDE.md,规则只有一个 home',
    ]
  }
  return []
}

if (isMain(import.meta.url)) await runMain(check)
