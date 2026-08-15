// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { ChevronUp, ChevronDown, Square } from "lucide-react";
import { parseAnsi } from "../ansi";
import type { ProcessEvent } from "../ipc/types";

interface Props {
  logs: ProcessEvent[];
  running: boolean;
  onCancel: () => void;
}

export default function OutputDrawer({ logs, running, onCancel }: Props) {
  const [open, setOpen] = useState(false);
  const isOpen = open || running;

  return (
    <section className="shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-full items-center gap-2 px-4 text-xs"
        style={{ backgroundColor: "var(--bg-raised)", color: "var(--text-muted)" }}
      >
        <span>输出</span>
        {running && <span style={{ color: "var(--brand)" }}>运行中…</span>}
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {isOpen && (
        <div className="flex h-48 flex-col">
          <div
            className="flex-1 overflow-auto px-3 py-2 text-xs"
            style={{ backgroundColor: "var(--bg)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          >
            {logs.length === 0 && <span>暂无输出</span>}
            {logs.map((e, i) => {
              if (e.kind === "exited") {
                return (
                  <div key={i} style={{ color: "var(--text-muted)" }}>
                    —— 进程已退出（code {e.code ?? "信号"}）——
                  </div>
                );
              }
              const baseColor = e.kind === "stderr" ? "var(--danger)" : "var(--text)";
              return (
                <div key={i} style={{ color: baseColor }}>
                  {parseAnsi(e.line).map((seg, j) => (
                    <span
                      key={j}
                      style={{
                        color: seg.color ?? baseColor,
                        fontWeight: seg.bold ? 700 : undefined,
                      }}
                    >
                      {seg.text}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
          {running && (
            <div className="flex justify-end px-3 py-1">
              <button className="btn btn-ghost" onClick={onCancel}>
                <span className="inline-flex items-center gap-1">
                  <Square size={11} />
                  取消
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
