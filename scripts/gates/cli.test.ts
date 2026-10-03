import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { isMain } from './cli.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('isMain', () => {
  it('被 vitest import 时为 false', () => {
    expect(isMain(import.meta.url)).toBe(false)
  })
})

describe('runMain 直接执行形态(回归:symlink 路径下必须仍然执法)', () => {
  it.skipIf(process.platform === 'win32')(
    '经含 symlink 组件的路径执行 gate,违规时退出码 1',
    () => {
      const real = mkdtempSync(join(tmpdir(), 'ai-mono-cli-'))
      try {
        // 复刻仓库根的 "type": "module":否则 tsx 按就近 package.json 把 gate 当 CJS,顶层 await 无法转换。
        writeFileSync(join(real, 'package.json'), '{"type":"module"}\n')
        const link = join(real, 'link')
        symlinkSync(real, link)
        const gate = join(link, 'gate-demo.ts')
        const cliUrl = new URL('cli.ts', import.meta.url).href
        writeFileSync(
          gate,
          `import { isMain, runMain } from ${JSON.stringify(cliUrl)}\n\nconst check = async () => ['demo 违规']\n\nif (isMain(import.meta.url)) await runMain(check)\n`,
        )
        const result = spawnSync('pnpm', ['exec', 'tsx', gate], { cwd: repoRoot, encoding: 'utf8' })
        expect(result.status).toBe(1)
        expect(result.stderr).toContain('demo 违规')
        // 违规路径下 runMain 只写 stderr(stdout 为空),名字出现在 "gate-demo 未通过" 一行。
        expect(result.stderr).toContain('gate-demo')
      } finally {
        rmSync(real, { recursive: true, force: true })
      }
    },
    30000,
  )
})
