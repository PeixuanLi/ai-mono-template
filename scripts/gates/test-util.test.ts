import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { withTempRepo } from './test-util.ts'

describe('withTempRepo', () => {
  it('写入文件并自动创建中间目录,fn 内可读', async () => {
    await withTempRepo({ '.agents/notes/README.md': '# 笔记' }, async (dir) => {
      expect(readFileSync(join(dir, '.agents/notes/README.md'), 'utf8')).toBe('# 笔记')
    })
  })

  it('fn 结束后夹具目录被删除', async () => {
    let captured = ''
    await withTempRepo({ 'a.txt': 'x' }, (dir) => {
      captured = dir
    })
    expect(existsSync(captured)).toBe(false)
  })
})
