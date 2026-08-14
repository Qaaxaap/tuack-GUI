<!--markdownlint-disable MD001 MD033 MD041 MD051-->

<div align="center">

# Tuack-GUI

一款美观、跨平台的 [Tuack-NG](https://github.com/tuack-ng/tuack-ng) 图形化前端

[![Stars](https://img.shields.io/github/stars/Qaaxaap/tuack-gui?label=Stars)](https://github.com/Qaaxaap/tuack-gui)
[![正式版 Release](https://img.shields.io/github/v/release/Qaaxaap/tuack-gui?style=flat-square&color=%233fb950&label=正式版)](https://github.com/Qaaxaap/tuack-gui/releases/latest)
[![测试版 Release](https://img.shields.io/github/v/release/Qaaxaap/tuack-gui?include_prereleases&style=flat-square&label=测试版)](https://github.com/Qaaxaap/tuack-gui/releases/)
[![License](https://img.shields.io/github/license/Qaaxaap/tuack-gui?style=flat-square&color=3cb371)](https://github.com/Qaaxaap/tuack-gui/blob/main/LICENSE)
[![GitHub Repo Languages](https://img.shields.io/github/languages/top/Qaaxaap/tuack-gui?style=flat-square)](https://github.com/Qaaxaap/tuack-gui)

</div>

## 简介

[Tuack-NG](https://github.com/tuack-ng/tuack-ng) 是一套用于辅助 OI/ACM 竞赛题目开发的命令行套件，但因其是 CLI 工具，上手门槛较高。

Tuack-GUI 旨在解决这一问题：**为 Tuack-NG 提供一个美观、跨平台的图形化界面**，让使用者无需记忆和输入命令，即可完成题目工程的配置与各项操作，扩大用户群体、降低上手难度。

> [!NOTE]
> 本项目目前处于早期开发阶段，尚未发布可用版本。

## 功能

### 核心目标

- [ ] 图形化配置 `conf.json`（表单 + 高级 JSON 编辑器），无需手改配置文件
- [ ] 按钮化执行 Tuack-NG 命令，无需手敲 CLI
- [ ] 现代化、VSC 风格的界面（活动栏 / 侧栏 / 主面板 / 底部输出面板 / 命令面板）

### 配置编辑

- [ ] 工程树展示（contest → day → problem 三层结构）
- [ ] 常用字段图形化表单（名称 / 标题 / 类型 / 时限 / 空限 / 子目录 / Subtask / 样例等）
- [ ] 高级原始 JSON 编辑与校验（兜底修改任意字段）
- [ ] 保存时保持字段顺序与格式，避免破坏手改内容

### 命令执行

- [ ] 生成工程（`gen`：contest / day / problem / data / samples / code）
- [ ] 测试题解（`test`，解析 `result.csv` 渲染评测记分板）
- [ ] 渲染题面（`ren`）
- [ ] 数据生成（`dmk`）
- [ ] 数据校验（`validate`）
- [ ] 批量修改配置（`conf`）
- [ ] 导出评测系统（`dump`）
- [ ] 文档检查 / 修复（`doc`）
- [ ] 命令输出流式展示、可取消、进度显示

### 分发

- [ ] 内置 Tuack-NG 二进制与资源，开箱即用
- [ ] 支持切换外部 Tuack-NG 可执行文件路径
- [ ] Windows / macOS / Linux 三平台安装包

### 现阶段不考虑的功能

- 题面编辑与预览

## 技术栈

- 桌面框架：[Tauri 2](https://tauri.app/)（Rust 后端 + 系统 WebView）
- 前端：[React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Tailwind CSS](https://tailwindcss.com/)
- 构建：[Vite](https://vitejs.dev/) + [pnpm](https://pnpm.io/)

## 架构

后端通过 `CommandRunner` 抽象屏蔽底层调用方式：

```
前端 ──(Tauri IPC, 异步 JSON)──▶ 后端
                                  ├─ CliRunner  （子进程调用 tuack-ng，当前方案）
                                  └─ RpcRunner  （JSON-RPC 客户端，待 Tuack-NG 提供接口后接入）
```

前端只通过语义化命令（如 `gen_contest` / `run_test` / `read_config`）与后端交互，待 Tuack-NG 暴露 JSON-RPC 接口后，会有计划迁移。

## 开始使用

> [!WARNING]
> 当前尚无可用版本，以下为开发环境搭建说明。

### 前置依赖

- [Node.js](https://nodejs.org/)（≥ 20）与 [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/)（stable 工具链）
- 系统 WebView：Windows 需 [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/)，macOS 与 Linux 使用系统自带 WebView

### 开发

```bash
pnpm install
pnpm tauri dev
```

## 下载

~~（尚未发布）~~ 敬请期待。届时将通过 [GitHub Releases](https://github.com/Qaaxaap/tuack-gui/releases/) 分发各平台安装包。

## 致谢

- [Tuack-NG](https://github.com/tuack-ng/tuack-ng) —— 本项目的后端核心，感谢 [Pulsar](https://github.com/Pulsar33550336) 的辛勤维护。
- [Tuack](https://github.com/mulab11/tuack) —— Tuack-NG 的设计思想来源。

## 许可证

Copyright (C) 2025-2026 Tuack-GUI Develop Team.

本项目以 [Affero General Public License 3.0](https://www.gnu.org/licenses/agpl-3.0.html) 或更高版本获得许可，详见 [LICENSE](LICENSE)。
