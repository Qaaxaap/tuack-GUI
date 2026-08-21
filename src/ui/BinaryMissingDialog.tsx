// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";

interface Props {
  onOpenSettings: () => void;
  onClose: () => void;
}

export default function BinaryMissingDialog({ onOpenSettings, onClose }: Props) {
  return (
    <Dialog open onOpenChange={(o) => {
      if (!o) onClose();
    }}>
      <DialogContent className="w-[min(640px,80vw)] rounded-lg p-4">
        <div className="text-sm" style={{ color: "var(--foreground)" }}>未检测到 tuack-ng</div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          执行命令需要 tuack-ng 二进制。请在设置中选择其可执行文件，或先安装 tuack-ng。
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>知道了</Button>
          <Button variant="default" onClick={onOpenSettings}>打开设置</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
