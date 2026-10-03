/** 极简 Result 工具:用显式返回值表达可失败计算,替代异常控制流。 */

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

/** 从 JSON 文本解析对象;失败返回 err 而不抛异常。 */
export function parseJsonObject(text: string): Result<Record<string, unknown>, string> {
  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return err('输入不是 JSON 对象')
    }
    return ok(parsed as Record<string, unknown>)
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e))
  }
}
