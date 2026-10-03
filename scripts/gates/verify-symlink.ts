import { existsSync, readFileSync, readlinkSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { isMain, runMain } from './cli.ts'

/**
 * 校验 CLAUDE.md 与 AGENTS.md 内容同一。
 * 不变量:读者从任一入口拿到的规则逐字节一致。symlink(首选)或一致副本均可,分叉即违规。
 * @param repoRoot 仓库根目录
 * @returns 中文违规清单,空数组表示通过
 */
export async function check(repoRoot: string): Promise<string[]> {
  const agentsPath = join(repoRoot, 'AGENTS.md')
  const claudePath = join(repoRoot, 'CLAUDE.md')

  if (!existsSync(agentsPath)) return ['AGENTS.md 不存在;它是全部常驻规则的唯一来源。']
  if (!existsSync(claudePath)) {
    return ['CLAUDE.md 不存在;修复:在仓库根执行 ln -s AGENTS.md CLAUDE.md']
  }

  if (statSync(claudePath).isSymbolicLink()) {
    const target = readlinkSync(claudePath)
    if (target !== 'AGENTS.md') {
      return [`CLAUDE.md 的 symlink 指向 ${target};必须指向 AGENTS.md`]
    }
    return []
  }

  const agents = readFileSync(agentsPath, 'utf8')
  const claude = readFileSync(claudePath, 'utf8')
  if (agents !== claude) {
    return [
      'CLAUDE.md 是普通文件且与 AGENTS.md 内容分叉;修复:删除后重建 symlink(ln -s AGENTS.md CLAUDE.md),规则只有一个 home',
    ]
  }
  return []
}

if (isMain(import.meta.url)) await runMain(check)
