// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

import { useState } from "react";
import type { Command } from "../ipc/types";

interface Props {
  title: string;
  label: string;
  placeholder: string;
  target: "day" | "problem";
  cwd: string;
  onRun: (cmd: Command, cwd: string) => void;
  onClose: () => void;
}

export default function AddNodeModal({ title, label, placeholder, target, cwd, onRun, onClose }: Props) {
  const [names, setNames] = useState("");

  function submit() {
    const list = names.trim() ? names.trim().split(/\s+/) : [];
    if (list.length === 0) return;
    onRun({ command: "gen", target, names: list, confirm: false }, cwd);
  }

  return (
    <Dialog open onOpenChange={(o) => {
      if (!o) onClose();
    }}>
      <DialogContent className="w-[min(640px,80vw)] rounded-lg p-4">
        <div className="text-sm" style={{ color: "var(--foreground)" }}>{title}</div>

        <Label className="mb-1 block">{label}</Label>
        <Input
          autoFocus
          value={names}
          onChange={(e) => setNames(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={placeholder}
          className="mb-3"
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="default" onClick={submit}>创建</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
