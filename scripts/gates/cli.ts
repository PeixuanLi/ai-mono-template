import { realpathSync } from 'node:fs'
import { basename } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

/** 判断当前模块是否被直接执行(而非被 vitest import)。对入口路径做 realpath:tsx 下 import.meta.url 是真实路径,argv[1] 可能含 symlink 组件,不比对齐会静默放行。 */
export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return pathToFileURL(realpathSync(entry)).href === moduleUrl
  } catch {
    return false
  }
}

/** 直接执行时:对 process.cwd() 跑 check,打印结果并以违规数决定退出码。 */
export async function runMain(check: (repoRoot: string) => Promise<string[]>): Promise<void> {
  const name = process.argv[1] ? basename(process.argv[1]).replace(/\.ts$/, '') : 'gate'
  const violations = await check(process.cwd())
  for (const v of violations) console.error(`✗ ${v}`)
  if (violations.length > 0) {
    console.error(`${violations.length} 项违规,${name} 未通过`)
    process.exit(1)
  }
  console.log(`✓ ${name}`)
}
