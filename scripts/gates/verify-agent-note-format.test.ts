import { describe, expect, it } from 'vitest'
import { withTempRepo } from './test-util.ts'
import { check } from './verify-agent-note-format.ts'

const validNote = (status: string) =>
  `---\nstatus: ${status}\ndate: 2026-10-03\n---\n\n# 示例\n\n决策:……\n\n## 考虑过的替代方案\n\n- 方案 A:……\n`

const readme = (links: string[]) => `# 笔记索引\n\n${links.join('\n')}\n`

describe('verify-agent-note-format', () => {
  it('无 .agents/notes 目录时放行(存在才查)', async () => {
    await withTempRepo({}, async (dir) => {
      expect(await check(dir)).toEqual([])
    })
  })

  it('合法笔记 + 完整索引通过;templates/ 不参与校验', async () => {
    await withTempRepo(
      {
        '.agents/notes/README.md': readme(['- [示例](implemented/demo.md)']),
        '.agents/notes/implemented/demo.md': validNote('implemented'),
        '.agents/notes/templates/note-template.md': '模板骨架,无状态行',
      },
      async (dir) => {
        expect(await check(dir)).toEqual([])
      },
    )
  })

  it('缺 frontmatter 状态行报错', async () => {
    await withTempRepo(
      {
        '.agents/notes/README.md': readme(['- [示例](implemented/demo.md)']),
        '.agents/notes/implemented/demo.md': '# 无状态行的笔记\n\n## 考虑过的替代方案\n\n- x\n',
      },
      async (dir) => {
        const v = await check(dir)
        expect(v).toHaveLength(1)
        expect(v[0]).toContain('状态行')
      },
    )
  })

  it('状态行与目录不一致报错', async () => {
    await withTempRepo(
      {
        '.agents/notes/README.md': readme(['- [示例](implemented/demo.md)']),
        '.agents/notes/implemented/demo.md': validNote('proposed'),
      },
      async (dir) => {
        const v = await check(dir)
        expect(v).toHaveLength(1)
        expect(v[0]).toContain('proposed')
      },
    )
  })

  it('缺"考虑过的替代方案"报错', async () => {
    await withTempRepo(
      {
        '.agents/notes/README.md': readme(['- [示例](implemented/demo.md)']),
        '.agents/notes/implemented/demo.md': '---\nstatus: implemented\n---\n\n# 无取舍记录\n',
      },
      async (dir) => {
        const v = await check(dir)
        expect(v.some((x) => x.includes('替代方案'))).toBe(true)
      },
    )
  })

  it('互链目标不存在报错', async () => {
    const note = validNote('implemented').replace('# 示例', '# 示例\n\n参见 [旧决策](../rejected/old.md)')
    await withTempRepo(
      {
        '.agents/notes/README.md': readme(['- [示例](implemented/demo.md)']),
        '.agents/notes/implemented/demo.md': note,
      },
      async (dir) => {
        const v = await check(dir)
        expect(v.some((x) => x.includes('互链目标不存在'))).toBe(true)
      },
    )
  })

  it('笔记未收录进 README 索引报错;索引指向不存在的笔记也报错', async () => {
    await withTempRepo(
      {
        '.agents/notes/README.md': readme(['- [示例](implemented/demo.md)', '- [幽灵](rejected/ghost.md)']),
        '.agents/notes/implemented/demo.md': validNote('implemented'),
        '.agents/notes/implemented/unlisted.md': validNote('implemented'),
      },
      async (dir) => {
        const v = await check(dir)
        expect(v.some((x) => x.includes('未收录'))).toBe(true)
        expect(v.some((x) => x.includes('ghost.md'))).toBe(true)
      },
    )
  })
})
