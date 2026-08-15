// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";

import { useState } from "react";
import PathPicker from "./PathPicker";
import type { Command } from "../ipc/types";

interface Props {
  onRun: (cmd: Command, cwd: string) => void;
  onClose: () => void;
}

export default function NewProjectModal({ onRun, onClose }: Props) {
  const [name, setName] = useState("");
  const [dir, setDir] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  function submit() {
    if (!name.trim() || !dir.trim()) return;
    onRun(
      { command: "gen", target: "contest", names: [name.trim()], confirm: false },
      dir.trim(),
    );
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
          新建工程
        </div>

        <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>
          工程名（比赛名）
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="如 noip2026"
          className="mb-2 w-full rounded px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
        />

        <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>
          父目录
        </label>
        <div className="mb-3 flex gap-2">
          <input
            value={dir}
            readOnly
            placeholder="点击右侧选择目录"
            className="flex-1 rounded px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
          <Button variant="ghost" onClick={() => setShowPicker(true)}>
            选择
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="default" onClick={submit}>
            创建
          </Button>
        </div>
      </div>

      {showPicker && (
        <PathPicker
          title="选择父目录"
          directory
          onSelect={(p) => {
            setDir(p);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
