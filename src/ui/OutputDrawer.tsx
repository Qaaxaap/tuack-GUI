// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function OutputDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <section className="shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full items-center gap-2 px-4 text-xs"
        style={{ backgroundColor: "var(--bg-raised)", color: "var(--text-muted)" }}
      >
        <span>输出</span>
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {open && (
        <div
          className="h-48 overflow-auto px-4 py-2 text-xs"
          style={{ backgroundColor: "var(--bg)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
        >
          <span style={{ color: "var(--success)" }}>[M0]</span> 命令输出将在这里流式显示
        </div>
      )}
    </section>
  );
}
