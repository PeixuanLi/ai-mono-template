import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/**
 * 在系统临时目录创建一次性仓库夹具,写入给定文件后执行 fn,结束后删除。
 * @param files 相对路径 → 文件内容的映射,中间目录自动创建
 * @param fn 接收夹具根目录的回调
 */
export async function withTempRepo(
  files: Record<string, string>,
  fn: (dir: string) => Promise<void> | void,
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'ai-mono-fixture-'))
  try {
    for (const [rel, content] of Object.entries(files)) {
      const target = join(dir, rel)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, content)
    }
    await fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
