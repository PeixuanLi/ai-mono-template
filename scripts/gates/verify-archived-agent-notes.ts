import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { isMain, runMain } from './cli.ts'
import { readFileAt, RATCHET_REFS } from './git-util.ts'
import { walkMd } from './fs-util.ts'

interface Manifest {
  files: Record<string, string>
}

/** 校验已解析对象是否为 { files: 文件名→sha256 } 形态;不是则返回 undefined。 */
function validateManifest(parsed: unknown): Manifest | undefined {
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const files = (parsed as { files?: unknown }).files
  if (typeof files !== 'object' || files === null || Array.isArray(files)) return undefined
  return { files: files as Record<string, string> }
}

function loadManifest(archivedDir: string): { manifest?: Manifest; violation?: string } {
  const p = join(archivedDir, 'manifest.json')
  if (!existsSync(p)) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return { violation: 'archived/manifest.json 不是合法 JSON;修复:git checkout -- .agents/notes/archived/manifest.json' }
  }
  const manifest = validateManifest(parsed)
  if (!manifest) {
    return { violation: 'archived/manifest.json 不是 { "files": { ... } } 结构;修复:git checkout -- .agents/notes/archived/manifest.json' }
  }
  for (const [name, sha] of Object.entries(manifest.files)) {
    if (name.includes('/') || name.includes('\\') || typeof sha !== 'string') {
      return { violation: `archived/manifest.json 的 files 键必须是不含路径的文件名与 sha256 字符串(发现:${name});修复:git checkout -- .agents/notes/archived/manifest.json` }
    }
  }
  return { manifest }
}

/** 收集全部锚点(origin/main、HEAD)上可解析的 manifest;锚点版本存在但坏形态时响亮报错。 */
function anchorManifests(repoRoot: string): { manifests: Manifest[]; violations: string[] } {
  const manifests: Manifest[] = []
  const violations: string[] = []
  for (const ref of RATCHET_REFS) {
    const text = readFileAt(ref, '.agents/notes/archived/manifest.json', repoRoot)
    if (text === undefined) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      violations.push(`锚点 ${ref} 的 manifest.json 不是合法 JSON;该版本必须先修复`)
      continue
    }
    const manifest = validateManifest(parsed)
    if (!manifest) {
      violations.push(`锚点 ${ref} 的 manifest.json 结构不对;该版本必须先修复`)
      continue
    }
    manifests.push(manifest)
  }
  return { manifests, violations }
}

/**
 * 校验归档冻结:归档文件 sha256 与 manifest 一致;manifest 相对 git 上一版只增不减;
 * archived/ 下的笔记(含嵌套)必须登记。归档 = 历史文物,永不修改。
 * 字节级冻结依赖仓库 .gitattributes 的 eol=lf;放宽它会让 Windows 检出产生不可修复的假阳。
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
    if (!existsSync(file) || !statSync(file).isFile()) {
      violations.push(`manifest 登记的 ${name} 已不存在或不是普通文件;归档条目只增不减,误删请用 git 恢复`)
      continue
    }
    const actual = createHash('sha256').update(readFileSync(file)).digest('hex')
    if (actual !== sha) {
      violations.push(`archived/${name} 内容与 manifest 的 sha256 不符;归档即冻结,恢复原文:git checkout -- .agents/notes/archived/${name}`)
    }
  }

  for (const file of walkMd(archivedDir)) {
    const name = relative(archivedDir, file)
    if (!(name in manifest.files)) {
      violations.push(`archived/${name} 未登记进 manifest.json;走 archive-agent-note 技能完成登记`)
    }
  }

  const { manifests: anchors, violations: anchorViolations } = anchorManifests(repoRoot)
  violations.push(...anchorViolations)
  for (const prev of anchors) {
    for (const [name, sha] of Object.entries(prev.files)) {
      if (manifest.files[name] !== sha) {
        violations.push(`manifest 中 ${name} 的登记被修改或删除;manifest 只增不改`)
      }
    }
  }
  return [...new Set(violations)]
}

if (isMain(import.meta.url)) await runMain(check)
