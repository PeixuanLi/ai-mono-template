import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** 递归收集 dir 下全部 .md 文件路径;dir 不存在返回空数组。 */
export function walkMd(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...walkMd(p))
    else if (entry.endsWith('.md')) out.push(p)
  }
  return out
}
