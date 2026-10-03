# packages/ 子树规则

- 包名 `@tmpl/<name>`(bootstrap 后为 `@<org>/<name>`),`"type": "module"`,编译配置继承根 `tsconfig.base.json`。
- 结构:`src/`(实现)+ `tests/`(行为测试,命名 `<模块>.test.ts`);单文件包保持单文件,不为分层而分层。
- 测试断言行为而非实现:重构实现(改名、换算法)不应弄红测试;示例见 packages/example/tests/。
- 新建包的时机:出现第二个消费者;只有一个使用者时留在原处。
- 区域规则下沉:某目录形成 ≥3 个同类包时,再为该组加子树 AGENTS.md;否则本文件够用。
