import { describe, expect, it } from 'vitest'
import { findUnregistered, selectGates, type GateEntry } from './run-gates.ts'

const registry: GateEntry[] = [
  { name: 'verify-symlink', modes: ['fast'] },
  { name: 'verify-agent-note-format', modes: ['fast', 'notes'] },
  { name: 'verify-archived-agent-notes', modes: ['notes'] },
  { name: 'verify-doc-budgets', modes: ['docs'] },
]

describe('selectGates(模式 → 门禁清单)', () => {
  it('all 返回全部注册门禁,顺序即注册顺序', () => {
    expect(selectGates('all', registry)).toEqual([
      'verify-symlink',
      'verify-agent-note-format',
      'verify-archived-agent-notes',
      'verify-doc-budgets',
    ])
  })

  it('fast 返回亚秒级快查子集(symlink + 笔记格式)', () => {
    expect(selectGates('fast', registry)).toEqual(['verify-symlink', 'verify-agent-note-format'])
  })

  it('notes 与 docs 分别返回各自范围词', () => {
    expect(selectGates('notes', registry)).toEqual(['verify-agent-note-format', 'verify-archived-agent-notes'])
    expect(selectGates('docs', registry)).toEqual(['verify-doc-budgets'])
  })
})

describe('findUnregistered(未接线自检)', () => {
  it('scripts/gates 下存在但未注册的 verify-* 被点名', () => {
    const un = findUnregistered(
      ['verify-symlink.ts', 'verify-agent-note-format.ts', 'verify-archived-agent-notes.ts', 'verify-doc-budgets.ts', 'verify-foo.ts', 'run-gates.ts', 'cli.ts', 'fs-util.ts', 'git-util.ts', 'test-util.ts', 'change-scope.ts', 'verify-foo.test.ts'],
      registry,
    )
    expect(un).toEqual(['verify-foo.ts'])
  })
})
