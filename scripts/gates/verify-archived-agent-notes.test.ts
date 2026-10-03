import { createHash } from 'node:crypto'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { gitCommitAll, withTempRepo } from './test-util.ts'
import { check } from './verify-archived-agent-notes.ts'

const archivedNote = '---\nstatus: archived\ndate: 2026-10-03\n---\n\n# 旧决策\n\n## 考虑过的替代方案\n\n- x\n'

function manifestOf(dir: string, name: string): string {
  const sha = createHash('sha256').update(readFileSync(join(dir, '.agents/notes/archived', name))).digest('hex')
  return JSON.stringify({ files: { [name]: sha } })
}

describe('verify-archived-agent-notes', () => {
  it('无 .agents/notes/archived 目录时放行(存在才查)', async () => {
    await withTempRepo({}, async (dir) => {
      expect(await check(dir)).toEqual([])
    })
  })

  it('archived 存在但 manifest 缺失报错', async () => {
    await withTempRepo({ '.agents/notes/archived/old.md': archivedNote }, async (dir) => {
      const v = await check(dir)
      expect(v).toHaveLength(1)
      expect(v[0]).toContain('manifest')
    })
  })

  it('登记匹配的 sha256 通过', async () => {
    await withTempRepo({ '.agents/notes/archived/old.md': archivedNote }, async (dir) => {
      writeFileSync(join(dir, '.agents/notes/archived/manifest.json'), manifestOf(dir, 'old.md'))
      expect(await check(dir)).toEqual([])
    })
  })

  it('归档文件被改动后 sha 不符报错;未登记文件报错', async () => {
    await withTempRepo({ '.agents/notes/archived/old.md': archivedNote }, async (dir) => {
      writeFileSync(join(dir, '.agents/notes/archived/manifest.json'), manifestOf(dir, 'old.md'))
      writeFileSync(join(dir, '.agents/notes/archived/old.md'), archivedNote + '\n手滑补了一句\n')
      writeFileSync(join(dir, '.agents/notes/archived/new.md'), archivedNote)
      const v = await check(dir)
      expect(v.some((x) => x.includes('冻结') && x.includes('old.md'))).toBe(true)
      expect(v.some((x) => x.includes('未登记') && x.includes('new.md'))).toBe(true)
    })
  })

  it('manifest 相对 git 上一版只增不减', async () => {
    await withTempRepo({ '.agents/notes/archived/old.md': archivedNote }, async (dir) => {
      writeFileSync(join(dir, '.agents/notes/archived/manifest.json'), manifestOf(dir, 'old.md'))
      gitCommitAll(dir)

      writeFileSync(join(dir, '.agents/notes/archived/new.md'), archivedNote)
      const next = JSON.parse(manifestOf(dir, 'old.md'))
      next.files['new.md'] = createHash('sha256').update(archivedNote).digest('hex')
      writeFileSync(join(dir, '.agents/notes/archived/manifest.json'), JSON.stringify(next))
      expect(await check(dir)).toEqual([])
      gitCommitAll(dir, 'second')

      const shrunk = { files: { 'old.md': next.files['old.md'] } }
      writeFileSync(join(dir, '.agents/notes/archived/manifest.json'), JSON.stringify(shrunk))
      rmSync(join(dir, '.agents/notes/archived/new.md'))
      const v = await check(dir)
      expect(v).toHaveLength(1)
      expect(v[0]).toContain('只增不改')
    })
  })

  it('manifest 不是合法 JSON 时返回违规而非抛异常', async () => {
    await withTempRepo(
      { '.agents/notes/archived/old.md': archivedNote, '.agents/notes/archived/manifest.json': '{broken' },
      async (dir) => {
        const v = await check(dir)
        expect(v).toHaveLength(1)
        expect(v[0]).toContain('不是合法 JSON')
      },
    )
  })
})
