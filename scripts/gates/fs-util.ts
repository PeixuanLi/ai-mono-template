import { existsSync, lstatSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** 递归收集 dir 下全部 .md 文件路径(仅小写 .md);dir 不存在或本身是符号链接时返回空数组。符号链接目录不遍历,免疫链接循环导致的 ELOOP。 */
export function walkMd(dir: string): string[] {
  if (!existsSync(dir)) return []
  if (!lstatSync(dir).isDirectory()) return []
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkMd(p))
    else if (entry.name.endsWith('.md')) out.push(p)
  }
  return out
}
