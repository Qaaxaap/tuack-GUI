// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";
import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "../components/ui/button";
import { currentPlatform } from "../ipc";
import TuackLogo from "./TuackLogo";

/**
 * Linux 专用自绘 CSD（客户端装饰）标题栏：置于工具栏上方。
 * 整条为拖拽区（deep，可交互元素自动排除），双击最大化/还原由
 * Tauri 拖拽脚本内建支持；Windows/macOS 使用原生标题栏，不渲染本组件。
 */
export default function LinuxTitlebar() {
  const [linux, setLinux] = useState(false);

  useEffect(() => {
    currentPlatform()
      .then((p) => setLinux(p === "linux"))
      .catch(() => {});
  }, []);

  if (!linux) return null;

  const win = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region="deep"
      className="flex h-8 shrink-0 items-center justify-between pl-3 pr-1"
      style={{ backgroundColor: "var(--bg-raised)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2">
        <TuackLogo size={14} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Tuack-GUI
        </span>
      </div>
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 [&_svg]:size-[13px]"
          title="最小化"
          onClick={() => win.minimize()}
        >
          <Minus size={13} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 [&_svg]:size-[11px]"
          title="最大化 / 还原"
          onClick={() => win.toggleMaximize()}
        >
          <Square size={11} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 [&_svg]:size-[13px] hover:bg-destructive hover:text-destructive-foreground"
          title="关闭"
          onClick={() => win.close()}
        >
          <X size={13} />
        </Button>
      </div>
    </div>
  );
}
