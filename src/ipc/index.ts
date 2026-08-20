// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Channel, invoke } from "@tauri-apps/api/core";
import type { BinaryInfo, Command, DirListing, FontPrefs, LastProject, ProcessEvent, Project, RenDefaults, RpcEvent } from "./types";

export function detectTuack(): Promise<BinaryInfo> {
  return invoke<BinaryInfo>("detect_tuack");
}

export function setTuackPath(path: string): Promise<void> {
  return invoke("set_tuack_path", { path });
}

export function clearTuackPath(): Promise<void> {
  return invoke("clear_tuack_path");
}

export function openProject(start: string): Promise<Project> {
  return invoke<Project>("open_project", { start });
}

export function runCommand(
  cmd: Command,
  cwd: string,
  onEvent: (e: ProcessEvent) => void,
): Promise<number> {
  const channel = new Channel<ProcessEvent>();
  channel.onmessage = onEvent;
  return invoke<number>("run_command", { cmd, cwd, onEvent: channel });
}

export function cancelCommand(id: number): Promise<void> {
  return invoke("cancel_command", { id });
}

export function resizePty(id: number, cols: number, rows: number): Promise<void> {
  return invoke("resize_pty", { id, cols, rows });
}

export function getLastProject(): Promise<LastProject | null> {
  return invoke<LastProject | null>("get_last_project");
}

export function saveLastProject(path: string, name: string): Promise<void> {
  return invoke("save_last_project", { path, name });
}

export function listDir(path: string): Promise<DirListing> {
  return invoke<DirListing>("list_dir", { path });
}

export function statPath(path: string): Promise<{ exists: boolean; is_dir: boolean }> {
  return invoke<{ exists: boolean; is_dir: boolean }>("stat_path", { path });
}

export function homeDir(): Promise<string> {
  return invoke<string>("home_dir");
}

export function readConfig(path: string): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("read_config", { path });
}

export function writeConfig(path: string, value: Record<string, unknown>): Promise<void> {
  return invoke("write_config", { path, value });
}

export function removeNode(parentDir: string, name: string): Promise<void> {
  return invoke("remove_node", { parentDir, name });
}

export function openInFileManager(path: string): Promise<void> {
  return invoke("open_in_file_manager", { path });
}

export function getFileManager(): Promise<string | null> {
  return invoke<string | null>("get_file_manager");
}

export function saveFileManager(cmd: string): Promise<void> {
  return invoke("set_file_manager", { cmd });
}

export function getFonts(): Promise<FontPrefs> {
  return invoke<FontPrefs>("get_fonts");
}

export function setFonts(uiFont: string, monoFont: string): Promise<void> {
  return invoke("set_fonts", { uiFont, monoFont });
}

export function getTheme(): Promise<string> {
  return invoke<string>("get_theme");
}

export function setTheme(theme: string): Promise<void> {
  return invoke("set_theme", { theme });
}

export function currentPlatform(): Promise<string> {
  return invoke<string>("current_platform");
}

export function getRenDefaults(projectRoot: string): Promise<RenDefaults> {
  return invoke<RenDefaults>("get_ren_defaults", { projectRoot });
}

export function setRenGlobal(template: string): Promise<void> {
  return invoke("set_ren_global", { template });
}

export function setRenProject(projectRoot: string, template: string): Promise<void> {
  return invoke("set_ren_project", { projectRoot, template });
}

/** 保存单个测试者最新评测结果（覆盖旧记录） */
export function saveJudgeResult(projectRoot: string, key: string, result: unknown): Promise<void> {
  return invoke<void>("save_judge_result", { projectRoot, key, result });
}

/** 读取全部评测结果缓存 */
export function loadJudgeResults(projectRoot: string): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("load_judge_results", { projectRoot });
}

export function readFileBase64(path: string): Promise<string> {
  return invoke<string>("read_file_base64", { path });
}

export function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

export function writeTextFile(path: string, content: string): Promise<void> {
  return invoke<void>("write_text_file", { path, content });
}

export function getAutoRen(): Promise<boolean> {
  return invoke<boolean>("get_auto_ren");
}

export function setAutoRen(enabled: boolean): Promise<void> {
  return invoke<void>("set_auto_ren", { enabled });
}

// ---------- tuack-ng-rpc 通道 ----------

export function rpcConnect(onEvent: (e: RpcEvent) => void): Promise<number> {
  const channel = new Channel<RpcEvent>();
  channel.onmessage = onEvent;
  return invoke<number>("rpc_connect", { onEvent: channel });
}

export function rpcRequest(
  conn: number,
  method: string,
  params?: Record<string, unknown>,
): Promise<unknown> {
  return invoke<unknown>("rpc_request", { conn, method, params });
}

export function rpcStop(conn: number): Promise<void> {
  return invoke<void>("rpc_stop", { conn });
}
