// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

import { useEffect, useState } from "react";
import { getFonts, setFonts } from "../ipc";
import { applyFonts } from "../fonts";

interface Props {
  onClose: () => void;
}

export default function FontSettingsModal({ onClose }: Props) {
  const [uiFont, setUiFont] = useState("");
  const [monoFont, setMonoFont] = useState("");

  useEffect(() => {
    getFonts()
      .then((f) => {
        setUiFont(f.ui_font);
        setMonoFont(f.mono_font);
      })
      .catch(() => {});
  }, []);

  function save() {
    const ui = uiFont.trim();
    const mono = monoFont.trim();
    setFonts(ui, mono)
      .then(() => {
        applyFonts(ui, mono);
        onClose();
      })
      .catch(() => {});
  }

  return (
    <Dialog open onOpenChange={(o) => {
      if (!o) onClose();
    }}>
      <DialogContent className="w-[min(440px,92vw)] rounded-lg p-4">
        <div className="mb-3 text-sm" style={{ color: "var(--text)" }}>字体设置</div>

        <Label className="mb-1 block">界面字体（留空 = 系统默认）</Label>
        <Input
          value={uiFont}
          onChange={(e) => setUiFont(e.currentTarget.value)}
          placeholder="如 Maple Mono NF CN"
          className="mb-3"
        />

        <Label className="mb-1 block">输出字体 / 等宽（留空 = Maple Mono NF CN → JetBrains Mono → 系统默认）</Label>
        <Input
          value={monoFont}
          onChange={(e) => setMonoFont(e.currentTarget.value)}
          placeholder="如 Maple Mono NF CN"
          className="mb-3"
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="default" onClick={save}>保存</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
