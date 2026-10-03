# 工作流

## 分支与 PR

- 分支从 main 切出,命名 `feat-<简述>` / `fix-<简述>`。
- 一个 PR 一个关注点;制度文本与对应代码同 PR(规则见 [AGENTS.md](../AGENTS.md) 治理先于代码)。
- PR 模板自带评审三查(世界验证、笔记保鲜、slop/CoT 痕迹),另含笔记取舍与 stack 注记两项注记。

## stacked PR

依赖式 PR 用 GitHub 原生 stack;子 PR 注明父 PR,按 stack 顺序合并。
重写历史必带 `--force-with-lease`,禁止裸 `--force`。

## 发布双闸

1. 每 PR 的 CI build-rehearsal job 无凭证演练打包——保证"随时可发布"。
2. 发版:打 tag 后手动触发 Release workflow(人工按钮);workflow 校验 tag 不落后于 main(含 main 全部提交)。
   直推 main 不经 PR 棘轮执法(锚点比对只在 PR 事件生效);为 main 开分支保护。

## Issue 与看板

Issue 量成为痛点前不预设流程;需要时按 .agents/skills/add-gate/SKILL.md 的路径升级,
并留决策笔记。
