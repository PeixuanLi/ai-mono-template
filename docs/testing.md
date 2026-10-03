# 测试原则

## 验证世界,而非代理自述

断言外部可观察状态:返回值的结构与内容、文件系统效果、进程退出码。
关键词探测与 mock 自述会让作弊的实现通过——包括无意作弊的 AI。
正例与反例见 packages/example/tests/index.test.ts 顶部注释。

## 测试描述行为

- 测试名读作一句行为描述("合法 JSON 对象 → ok 且携带解析结果")。
- 改行为必须连测试一起改,并在 PR 说明为什么行为变了。
- 覆盖不足时优先删死代码,而不是补自述式测试凑数。

## 判别联合的窄化写法

先断言判别值再窄化(`expect(r.ok).toBe(false)` 之后才 `if (!r.ok)` 取 error)——
不先断言判别值,窄化分支可能空泛通过。示例见 packages/example。

## 本地与 CI 的分界

本地按 `pnpm run scope` 的建议跑最小集;全量(typecheck/test/verify/build)由 CI 负责;
已通过的检查不重复跑。
