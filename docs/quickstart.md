# 快速上手

从克隆到第一个 PR 的完整路径。规则在 [AGENTS.md](../AGENTS.md),机制细节在 docs 其余各篇与技能;本文只排顺序、给命令与预期。

## 前置

node ≥ 22.19、pnpm 11.7(`corepack enable` 或自行安装)、git、GitHub。
可选 Claude Code:自动发现 `.claude/skills/` 的 5 个技能;其他 agent 读 AGENTS.md 同样生效。

## 第 0 天:初始化

```sh
git clone https://github.com/PeixuanLi/ai-mono-template my-app
cd my-app
pnpm install
pnpm bootstrap --scope @你的组织    # 可选 --no-example;--scope 形态必须是 @xxx
```

bootstrap 八步,幂等,失败修复后直接重跑:环境探测 → 改包前缀(`@tmpl/` → `@你的组织/`)→ 删示例包(仅 `--no-example`)→ CLAUDE.md 接线 → skills 接线 → `git init -b main` → install + 装钩子 → 门禁自检。看到"⑧ 完成"即全绿。

完成后手改 3 处(bootstrap ⑧ 亦会提示):README 首行标题与"基于"句、根 `package.json` 的 `name`、AGENTS.md 首段"模板"表述。

```sh
git add -A && git commit -m "chore: 基于模板初始化"
git remote set-url origin <你的远端>
git push -u origin main
```

推送后核查 Actions 首跑(`--frozen-lockfile` 要求 lockfile 随首提交入库,模板自带)。随后为 main 开分支保护(要求 PR + 必需状态检查);直推 main 不受棘轮执法,见 [workflow.md](workflow.md)。

## 第 1 周:第一个完整闭环

1. 切分支:`git checkout -b feat-<简述>`(修 bug 用 `fix-<简述>`)。
2. 有真取舍?先写笔记:复制 [.agents/notes/templates/note-template.md](../.agents/notes/templates/note-template.md)
   放 `proposed/`,必含"考虑过的替代方案",并在 [.agents/notes/README.md](../.agents/notes/README.md) 加索引。
   命名、局部重构等小决策不写。
3. 写代码与行为测试:断言外部可观察状态(返回值、文件内容、退出码),
   判据见 [testing.md](testing.md),正反例见 `packages/example/tests/index.test.ts` 顶部注释。
4. `pnpm run scope` → 只跑建议清单,全量由 CI 兜底(分界见 [testing.md](testing.md))。
   刚克隆还没建分支时提示找不到基线,先切分支或 `pnpm run scope -- --base <ref>`。
5. 提交:pre-commit 自动跑空白检查与 `verify:fast`,pre-push 自动跑 typecheck;红了按报错修。
6. 开 PR:PR 模板自带评审清单,机器查不了的留给人审;合并后把笔记移入 `implemented/` 并同步状态行。

## 与 agent 协作

开场白示例:"读 AGENTS.md,按 docs/architecture.md 探索仓库,然后做 X;改动跑 `pnpm run scope` 给出的检查。"
门禁报错是中文的、带修复命令,直接让 agent 照修。

技能触发时机:做取舍 → create-agent-note;决策被取代 → archive-agent-note;
评审 → code-review;推送前选检查 → pre-push-checks;约定被违反第二次 → add-gate。

## 第 1 月:治理生效

第一篇归档、第一次预算收紧(`budgets.json` 只许变小)、第一次 add-gate。
发布走双闸:打 tag 后手动触发 Release workflow,流程见 [workflow.md](workflow.md)。

## 常见问题

- Windows 上 CLAUDE.md 是副本不是 symlink:正常降级;verify-symlink 守内容同一,副本分叉照样红。
- `grep @tmpl` 剩 3 处:scripts 内实现常量,刻意不被改名重写,不是改名失败(模板仓库 [issue #7](https://github.com/PeixuanLi/ai-mono-template/issues/7))。
- `--no-example` 后文档有死引用:已知残留,按 bootstrap 日志提示清理([issue #4](https://github.com/PeixuanLi/ai-mono-template/issues/4))。
- 想同步模板的后续更新:无内置机制,模板按一次性起点设计;在意则 fork 使用 + GitHub Sync fork。
