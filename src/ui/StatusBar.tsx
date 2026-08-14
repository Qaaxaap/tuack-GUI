// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

export default function StatusBar() {
  return (
    <footer
      className="flex h-6 shrink-0 items-center justify-between px-3 text-xs"
      style={{ backgroundColor: "var(--vscode-statusbar-bg)", color: "#ffffff" }}
    >
      <span>就绪</span>
      <span>Tuack-NG: 未检测到</span>
    </footer>
  );
}
