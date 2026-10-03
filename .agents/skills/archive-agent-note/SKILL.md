---
name: archive-agent-note
description: 决策被取代需要归档、或删除过时笔记时使用。归档 = 冻结封存,登记 sha256。
---

# 归档与删除笔记

先判断:失去决策含量 → 直接删除(删除是常规运维);有历史价值 → 归档。

## 归档步骤

1. 移动文件到 .agents/notes/archived/,状态行改为 archived。
2. 计算指纹:`shasum -a 256 <文件名>`(取第一列)。
3. 把 文件名 → sha256 追加进 archived/manifest.json 的 files(只增不改)。
4. README 索引中把条目移到 archived 分组。
5. 在取代它的新决策笔记中互链旧笔记。
6. 运行 `pnpm run verify:notes` 确认。

## 冻结纪律

归档文件与 manifest 条目永不修改;内容与 manifest 不符时用 git 恢复原文,而不是"修好它"。
