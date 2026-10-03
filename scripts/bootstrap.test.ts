import { existsSync, lstatSync, readFileSync, readlinkSync, statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { withTempRepo } from './gates/test-util.ts'
import { bootstrap, ensureClaudeSymlink, renameScope, repairSkillsWiring } from './bootstrap.ts'

describe('renameScope', () => {
  it('替换包前缀;前后相同时为幂等空操作', () => {
    expect(renameScope('{ "name": "@tmpl/example" }', '@tmpl', '@acme')).toBe('{ "name": "@acme/example" }')
    expect(renameScope('@tmpl/x @tmpl/y', '@tmpl', '@tmpl')).toBe('@tmpl/x @tmpl/y')
  })
})

describe('ensureClaudeSymlink', () => {
  it.runIf(process.platform !== 'win32')('缺失时创建指向 AGENTS.md 的 symlink', async () => {
    await withTempRepo({ 'AGENTS.md': '# r' }, async (dir) => {
      expect(ensureClaudeSymlink(dir)).toBe('symlink')
    })
  })

  it('forceCopy 模式写内容副本(Windows 降级形态)', async () => {
    await withTempRepo({ 'AGENTS.md': '# r' }, async (dir) => {
      expect(ensureClaudeSymlink(dir, true)).toBe('copy')
      expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toBe('# r')
    })
  })
})

describe('repairSkillsWiring', () => {
  const skillsFixture = { '.agents/skills/code-review/SKILL.md': '---\nname: code-review\n---\n' }

  it.runIf(process.platform !== 'win32')('缺失/损坏时重建 symlink 接线', async () => {
    await withTempRepo(skillsFixture, async (dir) => {
      repairSkillsWiring(dir, () => {})
      const link = join(dir, '.claude', 'skills', 'code-review')
      expect(lstatSync(link).isSymbolicLink()).toBe(true)
      expect(readlinkSync(link)).toBe('../../.agents/skills/code-review')
    })
  })

  it('forceCopy 模式降级为目录副本', async () => {
    await withTempRepo(skillsFixture, async (dir) => {
      repairSkillsWiring(dir, () => {}, true)
      expect(existsSync(join(dir, '.claude', 'skills', 'code-review', 'SKILL.md'))).toBe(true)
      expect(statSync(join(dir, '.claude', 'skills', 'code-review')).isDirectory()).toBe(true)
    })
  })
})

describe('bootstrap', () => {
  it('完整流程:改名、git init、install→prepare→verify、重建两处接线', async () => {
    const cmds: string[][] = []
    await withTempRepo(
      {
        'AGENTS.md': '# r',
        'CLAUDE.md': '# r',
        'packages/example/package.json': '{ "name": "@tmpl/example", "version": "0.0.0" }',
      },
      async (dir) => {
        await bootstrap({
          dir,
          scope: '@acme',
          run: (args) => {
            cmds.push(args)
            return 0
          },
        })
        expect(JSON.parse(readFileSync(join(dir, 'packages/example/package.json'), 'utf8')).name).toBe('@acme/example')
        expect(existsSync(join(dir, '.git'))).toBe(true)
        expect(cmds).toEqual([['install'], ['run', 'prepare'], ['run', 'verify']])
        expect(lstatSync(join(dir, 'CLAUDE.md')).isSymbolicLink()).toBe(true)
      },
    )
  })

  it('keepExample=false 删除示例包', async () => {
    await withTempRepo(
      { 'AGENTS.md': '# r', 'CLAUDE.md': '# r', 'packages/example/package.json': '{}' },
      async (dir) => {
        await bootstrap({ dir, run: () => 0, log: () => {}, keepExample: false })
        expect(existsSync(join(dir, 'packages/example'))).toBe(false)
      },
    )
  })

  it('目标不是模板仓库时响亮失败', async () => {
    await withTempRepo({ 'README.md': '空' }, async (dir) => {
      await expect(bootstrap({ dir, run: () => 0, log: () => {} })).rejects.toThrow('不是模板仓库')
    })
  })
})
