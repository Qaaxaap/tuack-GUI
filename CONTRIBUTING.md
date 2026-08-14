# 向 Tuack-GUI 贡献代码

感谢您为 Tuack-GUI 做出贡献。Tuack-GUI 是 [Tuack-NG](https://github.com/tuack-ng/tuack-ng) 的图形化前端，采用 **Tauri 2 + React + TypeScript** 双栈开发。在贡献前，请务必阅读以下指南。

## 代码结构

```
src-tauri/   # Rust 后端（Tauri 命令、子进程调用）
src/         # 前端（React + TypeScript + Tailwind）
  ipc/       #   前端 ↔ 后端的 invoke 封装与类型定义
  ui/        #   UI 组件
  styles/    #   全局样式与设计令牌
```

## 命名规范

### Rust（`src-tauri/`）

| 对象 | 规范 | 示例 |
| --- | --- | --- |
| 文件 / 模块 | snake_case | `lib.rs` |
| 结构体 / 枚举 / 类型 | PascalCase | `BinaryInfo`、`Source` |
| 函数 / Tauri 命令 | snake_case | `open_project`、`detect_tuack` |
| 字段 | snake_case | `tuack_path` |
| 常量 | SCREAMING_SNAKE_CASE | `CONFIG_FILE_NAME` |

### TypeScript / React（`src/`）

| 对象 | 规范 | 示例 |
| --- | --- | --- |
| 组件文件 | PascalCase.tsx | `Toolbar.tsx` |
| 普通模块 | camelCase.ts | `index.ts`、`types.ts` |
| 组件名 | PascalCase | `Toolbar` |
| 接口 / 类型 / Props | PascalCase | `Project`、`ToolbarProps` |
| 函数 / 变量 | camelCase | `openProject` |

### CSS（`src/styles/`）

| 对象 | 规范 | 示例 |
| --- | --- | --- |
| 自定义 class | kebab-case | `.btn-primary` |
| 设计令牌（CSS 变量） | kebab-case | `--text-muted` |

## 提交规范

### 约定式提交

提交信息请遵守[约定式提交规范](https://www.conventionalcommits.org/zh-hans/v1.0.0/)：`type(scope): subject`，其中 scope 可选。

`type` 取值：`feat` / `fix` / `refactor` / `chore` / `docs` / `style` / `test` / `perf` / `ci` / `build`。

示例：

- `feat(project): 解析 contest→day→problem 工程树`
- `refactor(ui): 布局改为工具栏+侧栏+输出抽屉`
- `docs: 新增 CONTRIBUTING.md`

### 分支

- `main` 为默认开发分支。
- 功能 / 修复建议使用 `feat/<描述>`、`fix/<描述>` 分支。

## 提交前检查单

提交前请逐项确认：

- [ ] `pnpm build` 通过（TypeScript 类型检查 + 打包）
- [ ] 改动了 `src-tauri/` 时，`cargo check` 通过
- [ ] `pnpm tauri dev` 手动冒烟通过（功能 / 界面正常）
- [ ] 未提交 `node_modules/`、`dist/`、`src-tauri/target/`
- [ ] 新源文件已加 SPDX 版权头
- [ ] 无调试残留（`console.log`、`dbg!`、`println!`）
- [ ] 提交信息符合约定式提交

## 贡献准则

- **稳定：** 贡献的功能需要能尽可能稳定工作。
- **能用：** 提交补丁前，请在本地测试实现的功能是否正常。
- 修改样式 / 布局时，请保持与现有设计令牌（`src/styles/theme.css`）一致。

## 补丁质量

我们接受有瑕疵的补丁，但提交前至少应满足：

- 功能能够工作，提交前请在本地至少测试一次。
- 不建议在无人为干预的情况下，完全使用生成式人工智能实现功能。

## 合并更改

合并前请先测试贡献的代码。发起 Pull Request 时，简要描述改动，并最好附上功能演示截图 / 视频。

---

本项目以 [AGPL-3.0-or-later](LICENSE) 许可发布，您贡献的代码亦受此许可约束。
