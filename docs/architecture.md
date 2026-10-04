# 架构

本仓库是"AI 主笔、人类裁决、机器执法、笔记存证"的协作模板:角色权威边界由代码而非默契界定。

## 仓库布局

```text
AGENTS.md / CLAUDE.md   常驻规则(单一来源,symlink 分发)
docs/                   上手指引与现状文档:快速上手、架构、测试、工作流、写作
.agents/skills/         按需流程(触发式加载)
.agents/notes/          决策笔记(why/why-not),四态生命周期
scripts/gates/          门禁脚本(执法)+ 行为测试
packages/               工作区包(@tmpl/<name>)
```

## 指令分层

常驻层(根与子树 AGENTS.md)放规则;按需层(技能)放多步流程;决策层(笔记)放取舍理由。
一个事实只有一个 home,其余互链。

## 门禁体系

四个 verify-*.ts 由 run-gates 聚合:fast → pre-commit;all → CI;docs/notes → 手动范围词。
新增门禁的流程见 .agents/skills/add-gate/SKILL.md。

## 设计决策

关键取舍以笔记存证:[门禁优先于约定](../.agents/notes/implemented/gate-over-convention.md)、
[模板形态:全量即用](../.agents/notes/implemented/template-scope.md)、
[决策笔记制度](../.agents/notes/implemented/note-system.md)。
