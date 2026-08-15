// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

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
    <Dialog open onOpenChange={(o) => {
      if (!o) onClose();
    }}>
      <DialogContent className="w-[min(640px,80vw)] rounded-lg p-4">
        <div className="mb-3 text-sm" style={{ color: "var(--text)" }}>
          新建工程
        </div>

        <Label className="mb-1 block">工程名（比赛名）</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="如 noip2026"
          className="mb-2"
        />

        <Label className="mb-1 block">父目录</Label>
        <div className="mb-3 flex gap-2">
          <Input
            value={dir}
            readOnly
            placeholder="点击右侧选择目录"
            className="flex-1"
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
      </DialogContent>

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
    </Dialog>
  );
}
