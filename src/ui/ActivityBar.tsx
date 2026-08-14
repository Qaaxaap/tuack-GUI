// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Files, Search, SquareTerminal, GitBranch, Settings } from "lucide-react";

const topItems = [
  { id: "explorer", icon: Files, label: "资源管理器" },
  { id: "search", icon: Search, label: "搜索" },
  { id: "run", icon: SquareTerminal, label: "运行" },
  { id: "git", icon: GitBranch, label: "版本控制" },
];

const bottomItems = [{ id: "settings", icon: Settings, label: "设置" }];

export default function ActivityBar() {
  return (
    <nav
      className="flex w-12 shrink-0 flex-col justify-between py-2"
      style={{ backgroundColor: "var(--vscode-activitybar-bg)" }}
    >
      <div className="flex flex-col gap-1">
        {topItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            aria-label={label}
            className="flex h-12 w-12 items-center justify-center transition-colors hover:text-white"
            style={{ color: "var(--vscode-text-muted)" }}
          >
            <Icon size={24} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {bottomItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            aria-label={label}
            className="flex h-12 w-12 items-center justify-center transition-colors hover:text-white"
            style={{ color: "var(--vscode-text-muted)" }}
          >
            <Icon size={24} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </nav>
  );
}
