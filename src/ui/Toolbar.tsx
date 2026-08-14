// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Sparkles } from "lucide-react";

const actions = ["生成", "测试", "渲染", "数据", "校验", "导出"];

export default function Toolbar() {
  return (
    <header
      className="flex h-12 shrink-0 items-center gap-4 px-4"
      style={{ backgroundColor: "var(--bg-raised)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={18} style={{ color: "var(--accent)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Tuack-GUI
        </span>
      </div>

      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        未打开工程
      </span>

      <div className="ml-auto flex items-center gap-2">
        {actions.map((a) => (
          <button
            key={a}
            title="后续版本实现"
            className="rounded px-3 py-1.5 text-xs transition-colors hover:text-white"
            style={{
              backgroundColor: "var(--bg-card)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            {a}
          </button>
        ))}
      </div>
    </header>
  );
}
