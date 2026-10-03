import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { gitCommitAll, withTempRepo } from './test-util.ts'
import { check } from './verify-doc-budgets.ts'

const budgets = JSON.stringify({ docs: 150, notes: 120 })
const lines = (n: number) => `${'行\n'.repeat(n - 1)}行\n`

describe('verify-doc-budgets', () => {
  it('无 docs 与笔记时放行(存在才查)', async () => {
    await withTempRepo({ 'budgets.json': budgets }, async (dir) => {
      expect(await check(dir)).toEqual([])
    })
  })

  it('限额内的 docs 与笔记通过;templates/ 与 notes README 豁免', async () => {
    await withTempRepo(
      {
        'budgets.json': budgets,
        'docs/architecture.md': lines(10),
        '.agents/notes/README.md': lines(300),
        '.agents/notes/implemented/demo.md': lines(100),
        '.agents/notes/templates/note-template.md': lines(300),
      },
      async (dir) => {
        expect(await check(dir)).toEqual([])
      },
    )
  })

  it('超限报错并给出当前行数', async () => {
    await withTempRepo(
      { 'budgets.json': budgets, 'docs/architecture.md': lines(151) },
      async (dir) => {
        const v = await check(dir)
        expect(v).toHaveLength(1)
        expect(v[0]).toContain('151')
      },
    )
  })

  it('笔记超限同样报错', async () => {
    await withTempRepo(
      {
        'budgets.json': budgets,
        '.agents/notes/implemented/too-long.md': lines(121),
      },
      async (dir) => {
        const v = await check(dir)
        expect(v).toHaveLength(1)
        expect(v[0]).toContain('too-long.md')
        expect(v[0]).toContain('121')
      },
    )
  })

  it('预算相对 git 上一版只许收紧', async () => {
    await withTempRepo({ 'budgets.json': budgets, 'docs/architecture.md': lines(10) }, async (dir) => {
      gitCommitAll(dir)

      writeFileSync(join(dir, 'budgets.json'), JSON.stringify({ docs: 140, notes: 120 }))
      expect(await check(dir)).toEqual([])

      writeFileSync(join(dir, 'budgets.json'), JSON.stringify({ docs: 200, notes: 120 }))
      const v = await check(dir)
      expect(v.some((x) => x.includes('只许收紧'))).toBe(true)
    })
  })

  it('budgets.json 损坏或结构不对返回违规而非抛异常', async () => {
    await withTempRepo(
      { 'budgets.json': '{broken', 'docs/architecture.md': lines(10) },
      async (dir) => {
        const v = await check(dir)
        expect(v).toHaveLength(1)
        expect(v[0]).toContain('不是合法 JSON')
      },
    )
    await withTempRepo(
      { 'budgets.json': '{}', 'docs/architecture.md': lines(10) },
      async (dir) => {
        const v = await check(dir)
        expect(v).toHaveLength(1)
        expect(v[0]).toContain('结构')
      },
    )
  })

  it('棘轮锚点含 origin/main:已提交的放宽仍被抓(CI 形态)', async () => {
    await withTempRepo({ 'budgets.json': budgets, 'docs/architecture.md': lines(10) }, async (dir) => {
      gitCommitAll(dir)
      execFileSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: dir, stdio: 'ignore' })
      writeFileSync(join(dir, 'budgets.json'), JSON.stringify({ docs: 200, notes: 120 }))
      gitCommitAll(dir, 'loosen')
      const v = await check(dir)
      expect(v.some((x) => x.includes('只许收紧'))).toBe(true)
    })
  })

  it('锚点版本坏形态时响亮报错而非静默跳过', async () => {
    await withTempRepo({ 'budgets.json': '{broken', 'docs/architecture.md': lines(10) }, async (dir) => {
      gitCommitAll(dir)
      writeFileSync(join(dir, 'budgets.json'), budgets)
      const v = await check(dir)
      expect(v.some((x) => x.includes('锚点 HEAD') && x.includes('不是合法 JSON'))).toBe(true)
    })
  })
})
