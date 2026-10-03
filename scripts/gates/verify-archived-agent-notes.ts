import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { isMain, runMain } from './cli.ts'

interface Manifest {
  files: Record<string, string>
}

/** 读取 manifest;缺失返回空对象,JSON 损坏返回违规而非抛异常。 */
function loadManifest(archivedDir: string): { manifest?: Manifest; violation?: string } {
  const p = join(archivedDir, 'manifest.json')
  if (!existsSync(p)) return {}
  try {
    return { manifest: JSON.parse(readFileSync(p, 'utf8')) as Manifest }
  } catch {
    return { violation: 'archived/manifest.json 不是合法 JSON;修复:git checkout -- .agents/notes/archived/manifest.json' }
  }
}

/** 读取 git HEAD 版本的 manifest 作为棘轮基线;无 git 历史或文件不存在时返回空基线。 */
function previousManifest(repoRoot: string): Manifest {
  try {
    const out = execSync('git show HEAD:.agents/notes/archived/manifest.json', {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return JSON.parse(out.toString()) as Manifest
  } catch {
    return { files: {} }
  }
}

/**
 * 校验归档冻结:归档文件 sha256 与 manifest 一致;manifest 相对 git 上一版只增不减;
 * archived/ 下的笔记必须登记。归档 = 历史文物,永不修改。
 * @param repoRoot 仓库根目录
 * @returns 中文违规清单,空数组表示通过
 */
export async function check(repoRoot: string): Promise<string[]> {
  const archivedDir = join(repoRoot, '.agents', 'notes', 'archived')
  if (!existsSync(archivedDir)) return []

  const { manifest, violation } = loadManifest(archivedDir)
  if (violation) return [violation]
  if (!manifest) {
    return ['archived/ 存在但 manifest.json 缺失;归档必须登记 sha256,流程见 .agents/skills/archive-agent-note/SKILL.md']
  }
  const violations: string[] = []

  for (const [name, sha] of Object.entries(manifest.files)) {
    const file = join(archivedDir, name)
    if (!existsSync(file)) {
      violations.push(`manifest 登记的 ${name} 已不存在;归档条目只增不减,误删请用 git 恢复`)
      continue
    }
    const actual = createHash('sha256').update(readFileSync(file)).digest('hex')
    if (actual !== sha) {
      violations.push(`archived/${name} 内容与 manifest 的 sha256 不符;归档即冻结,恢复原文:git checkout -- .agents/notes/archived/${name}`)
    }
  }

  for (const f of readdirSync(archivedDir)) {
    if (f.endsWith('.md') && !(f in manifest.files)) {
      violations.push(`archived/${f} 未登记进 manifest.json;走 archive-agent-note 技能完成登记`)
    }
  }

  const prev = previousManifest(repoRoot)
  for (const [name, sha] of Object.entries(prev.files)) {
    if (manifest.files[name] !== sha) {
      violations.push(`manifest 中 ${name} 的登记被修改或删除;manifest 只增不改`)
    }
  }
  return violations
}

if (isMain(import.meta.url)) await runMain(check)
