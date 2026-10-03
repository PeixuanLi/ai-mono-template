# AGENTS.md

本仓库是一个 pnpm monorepo 模板,为"AI 主笔、人类裁决、机器执法、笔记存证"的协作范式提供开箱即用的基础设施。开始前先读 [docs/architecture.md](docs/architecture.md);建议让 agent 带着本文档探索代码库。

## 命令

```sh
pnpm install          # 安装依赖(node >=22.19)
pnpm run test         # vitest 全量(含门禁自测)
pnpm run typecheck    # TypeScript 严格检查
pnpm run lint         # eslint
pnpm run verify       # 全部门禁(CI 同款)
pnpm run verify:fast  # 提交前快查(约 1~2 秒)
pnpm run verify:docs  # 文档/笔记字数预算
pnpm run verify:notes # 笔记格式 + 归档冻结
pnpm run scope        # 按当前改动推荐最小检查集
pnpm run bootstrap    # 模板初始化(改名/symlink/git init/自检)
pnpm run build        # 构建全部包
```

## 规则(每条 1~3 行,细节在其 home)

- **治理先于代码**:改制度文本(AGENTS.md、门禁、CI)与改代码走同一个 PR;规则与实现不一致视为 bug。
- **规则常驻,流程按需**:常驻规则只在 AGENTS.md;多步流程放 `.agents/skills/`(触发式加载);一个事实只有一个 home,其余互链。
- **决策写笔记**:有真取舍的决策进 `.agents/notes/`,必含"考虑过的替代方案";小决策(命名、局部重构)不写。见 [.agents/notes/README.md](.agents/notes/README.md)。
- **保鲜义务**:改代码的 PR 必须同步更新受影响的 docs 与笔记;禁止在笔记里追加变更史,改结论 = 新笔记 + 旧笔记归档互链。
- **删除是常规运维**:被取代或失去决策含量的笔记直接删或归档;归档即冻结,永不再改。
- **验证世界,而非代理自述**:测试断言外部可观察状态(返回值、文件内容、退出码),不断言实现细节或 mock 交互自述。见 [docs/testing.md](docs/testing.md)。
- **本地窄,CI 全**:本地只跑与改动相关的最小检查(`pnpm run scope` 给推荐);全量矩阵由 CI 负责;已通过的检查不重复跑(分界见 [docs/testing.md](docs/testing.md))。
- **写作规范**:文档与笔记只留结论与事实,不留推理过程;禁 slop(重复规则、实现状态标注、强调通胀);判据是"HEAD 上的读者不访问任何会话记录,能否解析每个引用、核实每句话"。见 [docs/writing.md](docs/writing.md)。
- **凡被违反两次的约定,升级为门禁**:把约定变成会让 CI 变红的命令,流程见 `.agents/skills/add-gate/SKILL.md`。
- **stack PR**:依赖式 PR 用 GitHub 原生 stack;重写必带 `--force-with-lease`。见 [docs/workflow.md](docs/workflow.md)。
- **TODO 语义**:`FIXME` = 有 bug 待修;`TODO` = 缺功能;`XXX` = 危险绕行。
- **不引入行尾空白与末尾多余空行**(pre-commit 的 `git diff --cached --check` 把关);文件以恰好一个换行结尾由评审把关。
- **ESM only**:全仓 `"type": "module"`;相对导入用 `.ts` 后缀;跨包用包名。
