// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

export type Source = "Bundled" | "External";

export interface BinaryInfo {
  exe: string;
  assets: string;
  source: Source;
}

export interface ContestNode {
  name: string;
  title: string;
  dir: string;
  days: DayNode[];
}

export interface DayNode {
  name: string;
  title: string;
  dir: string;
  problems: ProblemNode[];
}

export interface ProblemNode {
  name: string;
  title: string;
  dir: string;
}

export interface Project {
  root: string;
  contest: ContestNode;
}

export type GenTarget =
  | "contest"
  | "day"
  | "problem"
  | "data"
  | "samples"
  | "code"
  | "all"
  | "lfs";

export type TestTarget = "data" | "sample";

export type DataTarget = "data" | "sample";

export type DmkAction = "gen" | "regen" | "reset";

export type DumpTarget = "lemon" | "arbiter";

export type Command =
  | { command: "gen"; target: GenTarget; names: string[]; confirm: boolean }
  | { command: "test"; target: TestTarget }
  | { command: "ren"; template: string; keep_tmp: boolean; no_auto_open: boolean }
  | { command: "dmk"; target: DataTarget; action: DmkAction; object: string; validate: boolean | null }
  | { command: "validate"; target: DataTarget; object: string }
  | { command: "dump"; target: DumpTarget }
  | { command: "doc-format"; explain: string | null }
  | { command: "doc-check"; explain: string | null }
  | { command: "doc-validate" }
  | { command: "conf-title"; values: string[] }
  | { command: "conf-time"; values: string[] }
  | { command: "conf-length"; values: string[] }
  | { command: "conf-migrate" };

export type ProcessEvent =
  | { kind: "output"; data: string }
  | { kind: "exited"; code: number | null };


export interface LastProject {
  path: string;
  name: string;
}


export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export interface DirListing {
  parent: string;
  entries: DirEntry[];
}

export type NodeKind = "contest" | "day" | "problem";

export interface FontPrefs {
  ui_font: string;
  mono_font: string;
}

export interface RenDefaults {
  global: string | null;
  project: string | null;
}

export interface ScoreSnapshot {
  time: string;
  csv: string;
  sample_csv: string;
}
