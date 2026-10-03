import process from 'node:process'
import { pathToFileURL } from 'node:url'

/** 判断当前模块是否被直接执行(而非被 vitest import)。 */
export function isMain(moduleUrl: string): boolean {
  return moduleUrl === pathToFileURL(process.argv[1] ?? '').href
}

/** 直接执行时:对 process.cwd() 跑 check,打印结果并以违规数决定退出码。 */
export async function runMain(check: (repoRoot: string) => Promise<string[]>): Promise<void> {
  const name = process.argv[1]?.split('/').pop()?.replace(/\.ts$/, '') ?? 'gate'
  const violations = await check(process.cwd())
  for (const v of violations) console.error(`✗ ${v}`)
  if (violations.length > 0) {
    console.error(`${violations.length} 项违规,${name} 未通过`)
    process.exit(1)
  }
  console.log(`✓ ${name}`)
}
