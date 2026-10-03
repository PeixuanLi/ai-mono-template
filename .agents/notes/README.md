# 决策笔记

回答 why/why-not 的仓库资产:docs 描述"现在是什么样",笔记记录"当时为什么这么定、放弃了什么"。一个事实只有一个 home,互链不复制。

## 生命周期

proposed(提案中)→ implemented(已落地);rejected = 评估后否决;archived = 被取代,冻结封存。
状态由所在目录编码,frontmatter 状态行必须与目录一致(verify-agent-note-format 把关)。

## 纪律

- 必含"## 考虑过的替代方案":不记录打败过什么,决策就会被反复重审。
- 保鲜:改代码的 PR 同步更新受影响笔记;改结论 = 新笔记 + 旧笔记归档互链,禁止追加变更史。
- 删除是常规运维:失去决策含量的笔记直接删;有历史价值的归档(登记 manifest,冻结)。
- 新笔记从 templates/note-template.md 起步,替换全部占位符(标题、date 等),创建流程见 .agents/skills/create-agent-note/SKILL.md。

## 索引

### implemented

- [决策笔记制度本身](implemented/note-system.md)
- [门禁优先于约定](implemented/gate-over-convention.md)
- [模板形态:全量即用](implemented/template-scope.md)

### rejected

- [不搬:双语三件套](rejected/bilingual-sidecars.md)
- [不搬:加权评审](rejected/weighted-review.md)
- [不搬:真 API 测试不设限](rejected/real-api-unrationed.md)

### archived

(暂无;归档后在此列出并用 manifest 冻结)
