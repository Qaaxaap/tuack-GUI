// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

export default function SideBar() {
  return (
    <aside
      className="flex w-60 shrink-0 flex-col"
      style={{ backgroundColor: "var(--bg-raised)", borderRight: "1px solid var(--border)" }}
    >
      <div
        className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        工程
      </div>
      <div
        className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        <p className="text-sm">尚未打开工程</p>
        <p className="text-xs">打开工程后将在此显示 contest → day → problem 树</p>
      </div>
    </aside>
  );
}
