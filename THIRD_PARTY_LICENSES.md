# 第三方许可声明

Tuack-GUI 的分发版本会捆绑以下第三方组件：外部二进制（Typst、Tuack-NG）、前端依赖（打包进 WebView 资源）与 Rust 依赖（静态链接进可执行文件）。感谢这些项目及其贡献者。

## Typst

- 项目：<https://github.com/typst/typst>
- 用途：题目渲染（`ren` 命令编译 PDF）
- 许可证：[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)

Copyright (c) Typst GmbH and the Typst Authors.

Typst 以 Apache License 2.0 许可发布。分发本组件需随附完整许可文本，见 <https://www.apache.org/licenses/LICENSE-2.0>。

## Tuack-NG

- 项目：<https://github.com/tuack-ng/tuack-ng>
- 用途：核心出题命令行套件（工程生成、测试、渲染、数据生成等）
- 许可证：[GNU Affero General Public License 3.0](https://www.gnu.org/licenses/agpl-3.0.html)（或更高版本）

Copyright (C) 2025-2026 Tuack-NG Develop Team.

Tuack-NG 以 AGPL-3.0-or-later 许可发布，与本项目采用相同许可证。完整许可文本见本仓库根目录的 [LICENSE](LICENSE)。

## 前端组件（打包进应用资源）

以下为直接运行时依赖；其各自的传递依赖亦随应用分发，均按其许可证随附于 `node_modules` 与 `pnpm-lock.yaml`。

| 组件 | 用途 | 许可证 |
|---|---|---|
| react / react-dom | 界面框架 | MIT |
| @tauri-apps/api | 前端 ↔ Rust 后端桥接 | Apache-2.0 OR MIT |
| @tauri-apps/plugin-opener | 打开外部文件管理器/链接 | MIT OR Apache-2.0 |
| @radix-ui/react-checkbox / dialog / dropdown-menu / label / select / slot / tabs | 无样式基础交互组件（对话框、下拉、选择器等） | MIT |
| @codemirror/lang-json / @codemirror/lang-markdown / @uiw/react-codemirror | 代码/Markdown 编辑器 | MIT |
| @xterm/xterm / @xterm/addon-fit | 命令输出终端渲染 | MIT |
| pdfjs-dist | PDF 预览渲染 | Apache-2.0 |
| class-variance-authority | 样式变体工具 | Apache-2.0 |
| clsx | 类名拼接工具 | MIT |
| tailwind-merge | 样式类合并工具 | MIT |
| lucide-react | 图标库 | ISC |

## Rust 组件（静态链接进可执行文件）

直接依赖：

| 组件 | 用途 | 许可证 |
|---|---|---|
| tauri | 应用框架 | Apache-2.0 OR MIT |
| tauri-plugin-opener | 外部打开能力 | Apache-2.0 OR MIT |
| tokio | 异步运行时 | MIT |
| serde / serde_json | 配置序列化 | MIT OR Apache-2.0 |
| path-clean | 路径规范化 | MIT OR Apache-2.0 |
| base64 | PDF 内容编码传输 | MIT OR Apache-2.0 |
| dirs | 系统目录定位 | MIT OR Apache-2.0 |
| portable-pty | 伪终端（命令输出） | MIT |
| chrono | 时间戳（记分板快照） | MIT OR Apache-2.0 |

传递依赖（`Cargo.lock` 共约 480 项，按许可证族统计；部分 crate 以源码包内 LICENSE 文件声明，以各源码为准）：

- MIT OR Apache-2.0 双许可：约 190 项（含 anyhow、bitflags、libc、regex、syn、url、windows-sys 等）
- MIT：约 100 项（含 gtk / webkit2gtk / javascriptcore-rs 等 Linux WebView 栈）
- Apache-2.0 OR MIT：约 45 项（含 tauri 系列、wry、tao、muda 等）
- MIT/Apache-2.0：约 16 项（含 winapi 系列等）
- Unicode-3.0：约 18 项（icu_* 国际化数据）
- MPL-2.0：5 项（cssparser、selectors 等）
- BSD / Zlib / ISC / Unlicense 等：若干项

完整清单与各自许可文本见 `Cargo.lock` 及各 crate 源码包。
