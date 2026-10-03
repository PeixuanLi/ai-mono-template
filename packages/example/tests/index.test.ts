import { describe, expect, it } from 'vitest'
import { err, ok, parseJsonObject } from '../src/index.ts'

/**
 * 世界验证正例:每个断言都针对外部可观察行为(返回值的结构与内容)。
 * 反例(自述式,禁止):
 *   expect(parseJsonObject).toHaveProperty('name')   // 通过但什么都没验证:断言实现的形状,不是行为
 *   const spy = vi.fn(parseJsonObject); spy('{}')    // 只断言 mock 被调用,
 *   expect(spy).toHaveBeenCalled()                    // 而不断言真实返回值
 * 判据:重构实现(改名、换算法)不应弄红行为测试;弄红了说明它断言的是自述。
 */
describe('parseJsonObject', () => {
  it('合法 JSON 对象 → ok 且携带解析结果', () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ ok: true, value: { a: 1 } })
  })

  it('非对象 JSON → err 并说明原因', () => {
    expect(parseJsonObject('[1,2]')).toEqual({ ok: false, error: '输入不是 JSON 对象' })
  })

  it('非法 JSON → err 携带解析错误信息', () => {
    const r = parseJsonObject('{oops}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('JSON')
  })
})

describe('ok/err 构造器', () => {
  it('ok 携带值,err 携带错误', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 })
    expect(err('x')).toEqual({ ok: false, error: 'x' })
  })
})
