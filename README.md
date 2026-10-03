# 你的项目名

基于 ai-mono-template 的 pnpm monorepo。协作范式:AI 主笔产出,人类裁决方向,机器执行规则,笔记保存理据。
开始前读 [AGENTS.md](AGENTS.md) 与 [docs/architecture.md](docs/architecture.md)。

## 第 0 天:初始化

```sh
pnpm install
pnpm bootstrap            # 可选:--scope @你的组织 / --no-example
pnpm run verify           # 预期:门禁全绿
git checkout -b feat-first
```

## 第 1 周:第一个完整闭环

1. 有取舍?让 agent 走 create-agent-note 技能写 proposed 笔记。
2. 写代码与行为测试(参照 packages/example 的世界验证式写法)。
3. `pnpm run scope` → 按建议跑最小检查。
4. 更新受影响的 docs 与笔记(保鲜义务)。
5. 提交 → 推送 → PR;评审走 code-review 技能三查。
6. 合并后把 proposed 移入 implemented。

## 第 1 月:治理生效

- 第一篇归档:走 archive-agent-note 技能。
- 第一次预算收紧:budgets.json 数值只许变小。
- 第一次 add-gate:某约定被违反两次时,把它变成会让 CI 变红的命令。

## 常用命令

见 [AGENTS.md](AGENTS.md) 命令表(一个事实一个 home,此处不重复)。

## 长期

- 直推 main 不经 PR 棘轮执法(锚点比对只在 PR 事件生效);为 main 开分支保护(见 docs/workflow.md)。
