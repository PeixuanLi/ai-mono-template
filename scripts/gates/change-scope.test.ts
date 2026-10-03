import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { recommend } from './change-scope.ts'
import { spawnPnpm } from './test-util.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('recommend(改动文件 → 最小检查集)', () => {
  it('空改动无建议', () => {
    expect(recommend([])).toEqual([])
  })

  it('包内改动 → 该包的 vitest 过滤运行 + typecheck', () => {
    const cmds = recommend(['packages/example/src/index.ts', 'packages/example/tests/index.test.ts'])
    expect(cmds).toEqual(['pnpm exec vitest run packages/example --passWithNoTests', 'pnpm run typecheck'])
  })

  it('docs 与笔记分别映射到范围词;门禁脚本触发全量回归', () => {
    const cmds = recommend([
      'docs/testing.md',
      '.agents/notes/implemented/demo.md',
      'scripts/gates/verify-symlink.ts',
    ])
    expect(cmds).toEqual([
      'pnpm run verify && pnpm run test',
      'pnpm run verify:docs',
      'pnpm run verify:notes',
      'pnpm run typecheck',
    ])
  })

  it('CI 与治理文件触发全量 verify', () => {
    expect(recommend(['.github/workflows/ci.yml'])).toEqual(['pnpm run verify'])
    expect(recommend(['lefthook.yml'])).toEqual(['pnpm run verify'])
    expect(recommend(['AGENTS.md'])).toEqual(['pnpm run verify'])
    expect(recommend(['budgets.json'])).toEqual(['pnpm run verify:docs'])
  })

  it('多个包去重且顺序稳定', () => {
    const cmds = recommend(['packages/a/src/x.ts', 'packages/b/src/y.ts', 'packages/a/tests/x.test.ts'])
    expect(cmds[0]).toBe('pnpm exec vitest run packages/a --passWithNoTests')
    expect(cmds).toContain('pnpm exec vitest run packages/b --passWithNoTests')
    expect(new Set(cmds).size).toBe(cmds.length)
  })
})

describe('CLI --base 校验', () => {
  it('显式 --base 不是可解析 ref 时响亮失败(exit 1)', () => {
    const r = spawnPnpm(['exec', 'tsx', 'scripts/gates/change-scope.ts', '--base', 'bogus-ref-xyz'], { cwd: repoRoot, encoding: 'utf8' })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('bogus-ref-xyz')
  }, 30000)
})
