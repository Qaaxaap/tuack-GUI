// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

export default function SideBar() {
  return (
    <aside
      className="flex w-60 shrink-0 flex-col"
      style={{
        backgroundColor: "var(--vscode-sidebar-bg)",
        borderRight: "1px solid var(--vscode-border)",
      }}
    >
      <div
        className="px-4 py-2 text-[11px] uppercase tracking-wider"
        style={{ color: "var(--vscode-text-muted)" }}
      >
        资源管理器
      </div>
      <div
        className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
        style={{ color: "var(--vscode-text-muted)" }}
      >
        <p className="text-sm">尚未打开工程</p>
        <p className="text-xs">工程树将在 M1 实现</p>
      </div>
    </aside>
  );
}
