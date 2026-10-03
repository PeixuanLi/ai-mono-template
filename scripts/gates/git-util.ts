import { execFileSync } from 'node:child_process'

/** 棘轮锚点候选:origin/main(CI 与多分支本地)优先,退回 HEAD。 */
export const RATCHET_REFS = ['origin/main', 'HEAD']

/**
 * 读取指定 ref 下某文件的文本内容。
 * @param ref git ref(如 'origin/main')
 * @param path 仓库内相对路径
 * @param cwd 仓库根目录
 * @returns 文件文本;ref 不存在或文件在该 ref 下不存在时为 undefined
 */
export function readFileAt(ref: string, path: string, cwd: string): string | undefined {
  try {
    const out = execFileSync('git', ['show', `${ref}:${path}`], { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
    return out.toString()
  } catch {
    return undefined
  }
}
