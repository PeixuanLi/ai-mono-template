import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { isMain, runMain } from './cli.ts'
import { walkMd } from './fs-util.ts'

const LIFECYCLE = ['proposed', 'implemented', 'rejected', 'archived'] as const
const ALTERNATIVES = /^##\s+考虑过的替代方案\s*$/m
const MD_LINK = /\[[^\]]*\]\(([^)]+\.md)\)/g

function parseStatus(content: string): string | undefined {
  const m = content.match(/^---\n([\s\S]*?)\n---\n/)
  const line = m?.[1].match(/^status:\s*(\S+)\s*$/m)
  return line?.[1]
}

/**
 * 校验决策笔记:状态行与目录一致、必含"考虑过的替代方案"、互链与 README 索引双向一致。
 * 只扫描四个生命周期目录;README.md 与 templates/ 不参与。
 * @param repoRoot 仓库根目录
 * @returns 中文违规清单,空数组表示通过
 */
export async function check(repoRoot: string): Promise<string[]> {
  const notesDir = join(repoRoot, '.agents', 'notes')
  const violations: string[] = []
  if (!existsSync(notesDir)) return violations

  const readmePath = join(notesDir, 'README.md')
  const indexed = new Set<string>()
  if (!existsSync(readmePath)) {
    violations.push('.agents/notes/README.md 不存在;它是笔记索引,生命周期目录有笔记时必须有索引')
  } else {
    for (const [, target] of readFileSync(readmePath, 'utf8').matchAll(MD_LINK)) {
      const abs = resolve(notesDir, target)
      if (!existsSync(abs)) {
        violations.push(`.agents/notes/README.md 索引指向不存在的笔记:${target}`)
      } else {
        indexed.add(relative(notesDir, abs))
      }
    }
  }

  for (const state of LIFECYCLE) {
    for (const file of walkMd(join(notesDir, state))) {
      const rel = relative(notesDir, file)
      const content = readFileSync(file, 'utf8')

      const status = parseStatus(content)
      if (status === undefined) {
        violations.push(`${rel} 缺少 frontmatter 状态行(status: proposed|implemented|rejected|archived);修复:参照 templates/note-template.md`)
      } else if (status !== state) {
        violations.push(`${rel} 状态行是 ${status},但所在目录是 ${state}/;状态与目录必须一致`)
      }

      if (!ALTERNATIVES.test(content)) {
        violations.push(`${rel} 缺少必填节"## 考虑过的替代方案";不记录打败过什么,决策就会被反复重审`)
      }

      for (const [, target] of content.matchAll(MD_LINK)) {
        if (target.startsWith('http')) continue
        if (!existsSync(resolve(dirname(file), target))) {
          violations.push(`${rel} 互链目标不存在:${target}`)
        }
      }

      if (existsSync(readmePath) && !indexed.has(rel)) {
        violations.push(`${rel} 未收录进 .agents/notes/README.md 索引`)
      }
    }
  }
  return violations
}

if (isMain(import.meta.url)) await runMain(check)
