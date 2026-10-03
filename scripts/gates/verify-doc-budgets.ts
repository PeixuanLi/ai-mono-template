import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { isMain, runMain } from './cli.ts'
import { walkMd } from './fs-util.ts'

interface Budgets {
  docs: number
  notes: number
}

const LIFECYCLE = ['proposed', 'implemented', 'rejected', 'archived'] as const

function loadBudgets(repoRoot: string): { budgets?: Budgets; violation?: string } {
  const p = join(repoRoot, 'budgets.json')
  if (!existsSync(p)) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return { violation: 'budgets.json 不是合法 JSON;修复:git checkout -- budgets.json' }
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { violation: 'budgets.json 不是 { "docs": 行数, "notes": 行数 } 结构;修复:git checkout -- budgets.json' }
  }
  const { docs, notes } = parsed as { docs?: unknown; notes?: unknown }
  if (typeof docs !== 'number' || typeof notes !== 'number' || docs < 0 || notes < 0) {
    return { violation: 'budgets.json 不是 { "docs": 行数, "notes": 行数 } 结构;修复:git checkout -- budgets.json' }
  }
  return { budgets: { docs, notes } }
}

/** 读取 git HEAD 版本的 budgets.json 作为棘轮基线;无历史或历史版本坏形态时退回当前值(首次起步不误报)。 */
function previousBudgets(repoRoot: string, current: Budgets): Budgets {
  try {
    const out = execSync('git show HEAD:budgets.json', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] })
    const parsed = JSON.parse(out.toString()) as { docs?: unknown; notes?: unknown }
    if (typeof parsed.docs !== 'number' || typeof parsed.notes !== 'number') return current
    return { docs: parsed.docs, notes: parsed.notes }
  } catch {
    return current
  }
}

function lineCount(content: string): number {
  return content.trimEnd().split('\n').length
}

/**
 * 字数预算棘轮:docs/** 每篇 ≤ budgets.docs 行,四个生命周期目录的笔记每篇 ≤ budgets.notes 行;
 * 预算数值相对 git 上一版只许持平或变小。AGENTS.md 体系与 .agents/skills/ 不在管辖范围。
 * @param repoRoot 仓库根目录
 * @returns 中文违规清单,空数组表示通过
 */
export async function check(repoRoot: string): Promise<string[]> {
  const docsDir = join(repoRoot, 'docs')
  const notesDir = join(repoRoot, '.agents', 'notes')
  const lifecycleNotes = LIFECYCLE.flatMap((s) => walkMd(join(notesDir, s)))
  if (!existsSync(docsDir) && lifecycleNotes.length === 0) return []

  const { budgets, violation } = loadBudgets(repoRoot)
  if (violation) return [violation]
  if (!budgets) return ['budgets.json 不存在;预算是门禁的配置,不能缺失']
  const violations: string[] = []

  for (const file of walkMd(docsDir)) {
    const n = lineCount(readFileSync(file, 'utf8'))
    if (n > budgets.docs) {
      violations.push(`${relative(repoRoot, file)} ${n} 行,超过 docs 预算 ${budgets.docs} 行;写短,或先在 PR 说明里论证收紧预算`)
    }
  }
  for (const file of lifecycleNotes) {
    const n = lineCount(readFileSync(file, 'utf8'))
    if (n > budgets.notes) {
      violations.push(`${relative(repoRoot, file)} ${n} 行,超过笔记预算 ${budgets.notes} 行;决策笔记只留结论与弃选`)
    }
  }

  const prev = previousBudgets(repoRoot, budgets)
  if (budgets.docs > prev.docs || budgets.notes > prev.notes) {
    violations.push(`预算只许收紧:docs ${prev.docs}→${budgets.docs},notes ${prev.notes}→${budgets.notes};放宽预算需要新决策笔记并在评审中说明`)
  }
  return violations
}

if (isMain(import.meta.url)) await runMain(check)
