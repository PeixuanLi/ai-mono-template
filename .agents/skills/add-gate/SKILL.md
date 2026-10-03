---
name: add-gate
description: 一条团队约定被违反第二次、准备把它升级为会让 CI 变红的检查时使用。
---

# 约定升级为门禁

背景:凡不能让 CI 变红的规则终将漂移(见 .agents/notes/implemented/gate-over-convention.md)。
一条约定被违反两次 = 漂移已实证,升级时机到了。

## 步骤

1. 在 scripts/gates/ 新建 verify-<名称>.ts:导出 `check(repoRoot): Promise<string[]>`(中文违规清单),
   文件尾加 `if (isMain(import.meta.url)) await runMain(check)`(参照现有门禁)。
2. 写行为测试:临时目录夹具,合法/非法样本各一(参照 scripts/gates/test-util.ts)。
3. 在 run-gates.ts 的 REGISTRY 登记并选择模式(all 必含;按性质加 fast/docs/notes)。
4. 若约定属于文档规则,在 AGENTS.md 对应条目处链接本门禁。
5. 用一篇笔记记录该约定的两次违反实例与升级理由(proposed → implemented)。

## 验收

构造一个违规样本,确认 `pnpm run verify` 变红;修复后变绿。
