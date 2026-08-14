// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import Select from "./Select";
import type { Command } from "../ipc/types";

interface CmdSpec {
  id: string;
  label: string;
  needsNames: boolean;
  nameLabel?: string;
  namePlaceholder?: string;
}

const COMMANDS: CmdSpec[] = [
  { id: "gen-day", label: "生成场次（gen day）", needsNames: true, nameLabel: "场次名", namePlaceholder: "如 day1 day2（可多个）" },
  { id: "gen-problem", label: "生成题目（gen problem）", needsNames: true, nameLabel: "题目名", namePlaceholder: "如 prob1 prob2（可多个）" },
  { id: "gen-all", label: "生成全部（gen all：数据+样例+题解）", needsNames: false },
  { id: "gen-data", label: "生成数据（gen data）", needsNames: false },
  { id: "gen-samples", label: "生成样例（gen samples）", needsNames: false },
  { id: "test-data", label: "测试正式数据（test data）", needsNames: false },
  { id: "test-sample", label: "测试样例（test sample）", needsNames: false },
  { id: "conf-migrate", label: "迁移配置（conf migrate）", needsNames: false },
];

function buildCommand(id: string, names: string[]): Command {
  switch (id) {
    case "gen-day":
      return { command: "gen", target: "day", names, confirm: false };
    case "gen-problem":
      return { command: "gen", target: "problem", names, confirm: false };
    case "gen-all":
      return { command: "gen", target: "all", names: [], confirm: true };
    case "gen-data":
      return { command: "gen", target: "data", names: [], confirm: true };
    case "gen-samples":
      return { command: "gen", target: "samples", names: [], confirm: true };
    case "test-data":
      return { command: "test", target: "data" };
    case "test-sample":
      return { command: "test", target: "sample" };
    default:
      return { command: "conf-migrate" };
  }
}

interface Props {
  defaultCwd: string;
  onRun: (cmd: Command, cwd: string) => void;
  onClose: () => void;
}

export default function CommandPanel({ defaultCwd, onRun, onClose }: Props) {
  const [cmdId, setCmdId] = useState(COMMANDS[0].id);
  const [names, setNames] = useState("");
  const [cwd, setCwd] = useState(defaultCwd);

  const spec = COMMANDS.find((c) => c.id === cmdId)!;

  function submit() {
    const trimmed = names.trim();
    let nameList: string[] = [];
    if (spec.needsNames) {
      if (!trimmed) return;
      nameList = trimmed.split(/\s+/);
    }
    onRun(buildCommand(cmdId, nameList), cwd.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div
        className="w-96 rounded-lg p-4"
        style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border)" }}
      >
        <div className="mb-3 text-sm" style={{ color: "var(--text)" }}>
          运行命令
        </div>

        <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>
          命令
        </label>
        <Select
          value={cmdId}
          options={COMMANDS.map((c) => ({ value: c.id, label: c.label }))}
          onChange={setCmdId}
        />

        {spec.needsNames && (
          <>
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>
              {spec.nameLabel ?? "名称"}
            </label>
            <input
              value={names}
              onChange={(e) => setNames(e.currentTarget.value)}
              placeholder={spec.namePlaceholder ?? "多个用空格分隔"}
              className="mb-2 w-full rounded px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
            />
          </>
        )}

        <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>
          工作目录（cwd）
        </label>
        <input
          value={cwd}
          onChange={(e) => setCwd(e.currentTarget.value)}
          className="mb-3 w-full rounded px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
        />

        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={submit}>
            运行
          </button>
        </div>
      </div>
    </div>
  );
}
