// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

const tabs = ["问题", "输出", "终端"];

export default function BottomPanel() {
  return (
    <section
      className="flex h-48 shrink-0 flex-col"
      style={{
        backgroundColor: "var(--vscode-panel-bg)",
        borderTop: "1px solid var(--vscode-border)",
      }}
    >
      <div className="flex items-center gap-1 px-2">
        {tabs.map((t, i) => (
          <button
            key={t}
            className="px-3 py-1 text-xs"
            style={{
              color: i === 0 ? "var(--vscode-text)" : "var(--vscode-text-muted)",
              borderTop: i === 0 ? "1px solid var(--vscode-focus)" : "1px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        className="flex-1 overflow-auto px-3 py-2 text-xs"
        style={{ color: "var(--vscode-text-muted)", fontFamily: "var(--font-mono)" }}
      >
        <span style={{ color: "#4ec9b0" }}>[M0]</span> 命令输出将在这里流式显示
      </div>
    </section>
  );
}
