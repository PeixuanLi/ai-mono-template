import { symlinkSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { withTempRepo } from './test-util.ts'
import { check } from './verify-symlink.ts'

describe('verify-symlink', () => {
  it('AGENTS.md 缺失时报错并给出修复命令', async () => {
    await withTempRepo({}, async (dir) => {
      const v = await check(dir)
      expect(v).toHaveLength(1)
      expect(v[0]).toContain('git checkout -- AGENTS.md')
    })
  })

  it('CLAUDE.md 缺失或悬空时报错并给出修复命令', async () => {
    await withTempRepo({ 'AGENTS.md': '# 规则' }, async (dir) => {
      let v = await check(dir)
      expect(v).toHaveLength(1)
      expect(v[0]).toContain('ln -s AGENTS.md CLAUDE.md')

      symlinkSync('不存在.md', join(dir, 'CLAUDE.md'))
      v = await check(dir)
      expect(v).toHaveLength(1)
      expect(v[0]).toContain('ln -s AGENTS.md CLAUDE.md')
    })
  })

  it.runIf(process.platform !== 'win32')('指向 AGENTS.md 的 symlink 通过', async () => {
    await withTempRepo({ 'AGENTS.md': '# 规则' }, async (dir) => {
      symlinkSync('AGENTS.md', join(dir, 'CLAUDE.md'))
      expect(await check(dir)).toEqual([])
    })
  })

  it.runIf(process.platform !== 'win32')('symlink 指向别处时报错,即使内容一致', async () => {
    await withTempRepo({ 'AGENTS.md': '# 规则', 'other.md': '# 规则' }, async (dir) => {
      symlinkSync('other.md', join(dir, 'CLAUDE.md'))
      const v = await check(dir)
      expect(v).toHaveLength(1)
      expect(v[0]).toContain('symlink')
    })
  })

  it('内容一致的普通文件副本通过(Windows 降级形态)', async () => {
    await withTempRepo({ 'AGENTS.md': '# 规则', 'CLAUDE.md': '# 规则' }, async (dir) => {
      expect(await check(dir)).toEqual([])
    })
  })

  it('副本内容分叉时报错', async () => {
    await withTempRepo({ 'AGENTS.md': '# 规则', 'CLAUDE.md': '# 旧规则' }, async (dir) => {
      const v = await check(dir)
      expect(v).toHaveLength(1)
      expect(v[0]).toContain('分叉')
    })
  })
})
