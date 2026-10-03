import { existsSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { isMain, runMain } from './cli.ts'
import { readFileAt, RATCHET_REFS } from './git-util.ts'
import { walkMd } from './fs-util.ts'

interface Budgets {
  docs: number
  notes: number
}

const LIFECYCLE = ['proposed', 'implemented', 'rejected', 'archived'] as const

/** 判定已解析对象是否为合法预算(docs/notes 均为非负整数)。 */
function isBudgets(parsed: unknown): parsed is Budgets {
  if (typeof parsed !== 'object' || parsed === null) return false
  const { docs, notes } = parsed as { docs?: unknown; notes?: unknown }
  return Number.isInteger(docs) && Number.isInteger(notes) && (docs as number) >= 0 && (notes as number) >= 0
}

function loadBudgets(repoRoot: string): { budgets?: Budgets; violation?: string } {
  const p = join(repoRoot, 'budgets.json')
  if (!existsSync(p)) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return { violation: 'budgets.json 不是合法 JSON;修复:git checkout -- budgets.json' }
  }
  if (!isBudgets(parsed)) {
    return { violation: 'budgets.json 不是 { "docs": 行数, "notes": 行数 } 结构(非负整数);修复:git checkout -- budgets.json' }
  }
  return { budgets: parsed }
}

/** 收集全部可解析锚点的预算并取逐字段最小值;锚点版本存在但坏形态时响亮报错。 */
function anchorBudgets(repoRoot: string): { min?: Budgets; violations: string[] } {
  const caps: Budgets[] = []
  const violations: string[] = []
  for (const ref of RATCHET_REFS) {
    const text = readFileAt(ref, 'budgets.json', repoRoot)
    if (text === undefined) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      violations.push(`锚点 ${ref} 的 budgets.json 不是合法 JSON;该版本必须先修复`)
      continue
    }
    if (!isBudgets(parsed)) {
      violations.push(`锚点 ${ref} 的 budgets.json 结构不对;该版本必须先修复`)
      continue
    }
    caps.push(parsed)
  }
  const min = caps.length
    ? { docs: Math.min(...caps.map((c) => c.docs)), notes: Math.min(...caps.map((c) => c.notes)) }
    : undefined
  return { min, violations }
}

function lineCount(content: string): number {
  return content.trimEnd().split('\n').length
}

/**
 * 字数预算棘轮:docs/** 每篇 ≤ budgets.docs 行,四个生命周期目录的笔记每篇 ≤ budgets.notes 行;
 * 预算数值相对全部棘轮锚点(origin/main、HEAD)只许持平或变小。AGENTS.md 体系与 .agents/skills/ 不在管辖范围。
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
      violations.push(`${relative(repoRoot, file)} ${n} 行,超过 docs 预算 ${budgets.docs} 行;写短或拆分文件`)
    }
  }
  for (const file of lifecycleNotes) {
    const n = lineCount(readFileSync(file, 'utf8'))
    if (n > budgets.notes) {
      violations.push(`${relative(repoRoot, file)} ${n} 行,超过笔记预算 ${budgets.notes} 行;决策笔记只留结论与弃选`)
    }
  }

  const { min: prev, violations: anchorViolations } = anchorBudgets(repoRoot)
  violations.push(...anchorViolations)
  if (prev && (budgets.docs > prev.docs || budgets.notes > prev.notes)) {
    violations.push(`预算只许收紧:docs ${prev.docs}→${budgets.docs},notes ${prev.notes}→${budgets.notes};预算不可放宽——确需放宽由维护者跳过本门禁并留决策笔记`)
  }
  return [...new Set(violations)]
}

if (isMain(import.meta.url)) await runMain(check)
