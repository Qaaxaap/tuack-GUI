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

export type Command =
  | { command: "gen"; target: GenTarget; names: string[]; confirm: boolean }
  | { command: "test"; target: TestTarget }
  | { command: "conf-migrate" };

export type ProcessEvent =
  | { kind: "stdout"; line: string }
  | { kind: "stderr"; line: string }
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
