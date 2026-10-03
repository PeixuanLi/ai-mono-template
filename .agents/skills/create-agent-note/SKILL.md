---
name: create-agent-note
description: 做出有真取舍的技术决策、准备把决策写入 .agents/notes/ 时使用。
---

# 创建决策笔记

触发条件:存在至少两个可行方案且选择有长期影响(选库、架构、制度)。
小决策(命名、局部重构)不写笔记。

## 步骤

1. 从 .agents/notes/templates/note-template.md 复制起步,替换全部占位符(标题、date 等)。
2. 状态与目录一致:提案期放 proposed/,随实现 PR 移入 implemented/ 并同步状态行。
3. 写"## 考虑过的替代方案":每个被放弃的方案一句为什么放弃。
4. 在 .agents/notes/README.md 索引追加条目。
5. 运行 `pnpm run verify:notes` 确认格式合规。

## 禁止

- 禁止追加变更史;改结论 = 新笔记 + 旧笔记归档互链。
- 禁止写推理过程;只留结论、理由与弃选。
