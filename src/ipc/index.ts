// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Channel, invoke } from "@tauri-apps/api/core";
import type { BinaryInfo, Command, DirListing, LastProject, ProcessEvent, Project } from "./types";

export function detectTuack(): Promise<BinaryInfo> {
  return invoke<BinaryInfo>("detect_tuack");
}

export function setTuackPath(path: string): Promise<void> {
  return invoke("set_tuack_path", { path });
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

export function getLastProject(): Promise<LastProject | null> {
  return invoke<LastProject | null>("get_last_project");
}

export function saveLastProject(path: string, name: string): Promise<void> {
  return invoke("save_last_project", { path, name });
}

export function listDir(path: string): Promise<DirListing> {
  return invoke<DirListing>("list_dir", { path });
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

export function openInFileManager(path: string): Promise<void> {
  return invoke("open_in_file_manager", { path });
}

export function getFileManager(): Promise<string | null> {
  return invoke<string | null>("get_file_manager");
}

export function saveFileManager(cmd: string): Promise<void> {
  return invoke("set_file_manager", { cmd });
}
