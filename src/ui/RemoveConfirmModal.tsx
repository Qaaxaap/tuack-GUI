// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";

import { useState } from "react";
import { removeNode } from "../ipc";

interface Props {
  kind: "day" | "problem";
  name: string;
  parentDir: string;
  onRemoved: () => void;
  onClose: () => void;
}

export default function RemoveConfirmModal({ kind, name, parentDir, onRemoved, onClose }: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function confirm() {
    setBusy(true);
    setError("");
    removeNode(parentDir, name)
      .then(() => {
        onRemoved();
        onClose();
      })
      .catch((e) => {
        setBusy(false);
        setError(String(e));
      });
  }

  const what = kind === "day" ? "场次" : "题目";

  return (
    <Dialog open onOpenChange={(o) => {
      if (!o) onClose();
    }}>
      <DialogContent className="w-96 rounded-lg p-4">
        <div className="text-sm" style={{ color: "var(--text)" }}>
          删除{what}「{name}」
        </div>

        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          只会从父级 conf.json 的 subdir 中移除该条目，
          <span style={{ color: "var(--text)" }}>不会删除磁盘上的文件夹</span>。
          之后仍可通过「新建」重新加入。
        </p>

        {error && (
          <div className="text-xs" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            删除
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
