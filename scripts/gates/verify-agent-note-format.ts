import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { isMain, runMain } from './cli.ts'
import { walkMd } from './fs-util.ts'

const LIFECYCLE = ['proposed', 'implemented', 'rejected', 'archived'] as const
const ALTERNATIVES = /^##\s+考虑过的替代方案\s*$/m
const MD_LINK = /\[[^\]]*\]\(([^)]+)\)/g

/** 读取文本并归一化:去 BOM、CRLF→LF(Windows 检出不应让门禁全红)。 */
function readText(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
}

/** 取链接目标:剥离 #锚点;纯锚点或非 .md 目标返回 undefined;百分号编码的中文路径解码。 */
function linkTarget(raw: string): string | undefined {
  const path = raw.split('#')[0].trim()
  if (path === '' || !path.endsWith('.md')) return undefined
  try {
    return decodeURI(path)
  } catch {
    return path
  }
}

function parseStatus(content: string): string | undefined {
  const m = content.match(/^---\n([\s\S]*?)\n---\n/)
  const line = m?.[1].match(/^status:\s*(\S+)\s*$/m)
  return line?.[1]
}

/**
 * 校验决策笔记:状态行与目录一致、必含"考虑过的替代方案"、互链与 README 索引双向一致。
 * 只扫描四个生命周期目录;README.md 与 templates/ 不参与。链接支持 #锚点与百分号编码的中文路径。
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
    violations.push('.agents/notes/README.md 不存在;它是笔记索引,.agents/notes 目录存在时必须有')
  } else {
    for (const [, raw] of readText(readmePath).matchAll(MD_LINK)) {
      const target = linkTarget(raw)
      if (target === undefined || target.startsWith('http')) continue
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
      const content = readText(file)

      const status = parseStatus(content)
      if (status === undefined) {
        violations.push(`${rel} 缺少 frontmatter 状态行(status: proposed|implemented|rejected|archived);修复:参照 templates/note-template.md`)
      } else if (status !== state) {
        violations.push(`${rel} 状态行是 ${status},但所在目录是 ${state}/;状态与目录必须一致`)
      }

      if (!ALTERNATIVES.test(content)) {
        violations.push(`${rel} 缺少必填节"## 考虑过的替代方案";不记录打败过什么,决策就会被反复重审`)
      }

      for (const [, raw] of content.matchAll(MD_LINK)) {
        const target = linkTarget(raw)
        if (target === undefined || target.startsWith('http')) continue
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
