import { execFileSync } from 'node:child_process'
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

/**
 * 在 dir 初始化 git 仓库并把现有全部文件提交为一次提交(棘轮类门禁测试用)。
 * @param dir 夹具仓库根目录
 * @param message 提交信息,默认 'fixture'
 */
export function gitCommitAll(dir: string, message = 'fixture'): void {
  execFileSync('git', ['init', '-b', 'main'], { cwd: dir, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.email', 'fixture@test'], { cwd: dir, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.name', 'fixture'], { cwd: dir, stdio: 'ignore' })
  execFileSync('git', ['add', '-A'], { cwd: dir, stdio: 'ignore' })
  execFileSync('git', ['-c', 'commit.gpgsign=false', 'commit', '-m', message], { cwd: dir, stdio: 'ignore' })
}
