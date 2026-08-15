// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";

import { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Square } from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { resizePty } from "../ipc";
import type { ProcessEvent } from "../ipc/types";

interface Props {
  logs: ProcessEvent[];
  running: boolean;
  runId: number | null;
  onCancel: () => void;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** 从 CSS 令牌构造 xterm 主题（随深浅色切换） */
function buildTheme() {
  return {
    background: cssVar("--bg"),
    foreground: cssVar("--text"),
    cursor: cssVar("--text"),
    black: cssVar("--ansi-0"),
    red: cssVar("--ansi-1"),
    green: cssVar("--ansi-2"),
    yellow: cssVar("--ansi-3"),
    blue: cssVar("--ansi-4"),
    magenta: cssVar("--ansi-5"),
    cyan: cssVar("--ansi-6"),
    white: cssVar("--ansi-7"),
    brightBlack: cssVar("--ansi-bright-0"),
    brightRed: cssVar("--ansi-bright-1"),
    brightGreen: cssVar("--ansi-bright-2"),
    brightYellow: cssVar("--ansi-bright-3"),
    brightBlue: cssVar("--ansi-bright-4"),
    brightMagenta: cssVar("--ansi-bright-5"),
    brightCyan: cssVar("--ansi-bright-6"),
    brightWhite: cssVar("--ansi-bright-7"),
  };
}

export default function OutputDrawer({ logs, running, runId, onCancel }: Props) {
  const [open, setOpen] = useState(false);
  const isOpen = open || running;

  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const writtenRef = useRef(0);
  const runIdRef = useRef<number | null>(null);
  runIdRef.current = runId;

  // 创建终端（一次）
  useEffect(() => {
    const host = hostRef.current;
    if (!host || termRef.current) return;
    const term = new Terminal({
      convertEol: false,
      disableStdin: true,
      cursorBlink: false,
      fontSize: 12,
      fontFamily: cssVar("--font-mono"),
      theme: buildTheme(),
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    termRef.current = term;
    fitRef.current = fit;
    return () => {
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // 主题/字体变化时同步 xterm
  useEffect(() => {
    const sync = () => {
      const term = termRef.current;
      if (!term) return;
      term.options.theme = buildTheme();
      const fam = cssVar("--font-mono");
      if (fam && fam !== term.options.fontFamily) {
        term.options.fontFamily = fam;
      }
      term.refresh(0, term.rows - 1);
    };
    window.addEventListener("tuack-styles-changed", sync);
    sync();
    return () => window.removeEventListener("tuack-styles-changed", sync);
  }, []);

  // 面板展开 / 容器尺寸变化 / runId 就绪时 fit，并把真实尺寸回推给 PTY
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const doFit = () => {
      if (!isOpen) return;
      fitRef.current?.fit();
      const term = termRef.current;
      const id = runIdRef.current;
      if (term && id != null) {
        resizePty(id, term.cols, term.rows).catch(() => {});
      }
    };
    const t = setTimeout(doFit, 0);
    const ro = new ResizeObserver(doFit);
    ro.observe(host);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [isOpen, runId]);

  // 增量写入日志（logs 被清空视为新一轮运行，重置终端）
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    if (logs.length < writtenRef.current) {
      term.reset();
      writtenRef.current = 0;
    }
    for (let i = writtenRef.current; i < logs.length; i++) {
      const e = logs[i];
      if (e.kind === "exited") {
        term.write(`\x1b[2m—— 进程已退出（code ${e.code ?? "信号"}）——\x1b[0m\r\n`);
      } else {
        // PTY 原始字节：ANSI/光标控制交给 xterm 解析（进度条原地刷新）
        term.write(e.data);
      }
    }
    writtenRef.current = logs.length;
  }, [logs]);

  return (
    <section className="shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
      <Button
        variant="ghost"
        onClick={() => setOpen(!open)}
        className="h-8 w-full justify-start gap-2 rounded-none bg-card px-4 text-xs font-normal text-muted-foreground"
      >
        <span>输出</span>
        {running && <span style={{ color: "var(--brand)" }}>运行中…</span>}
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </Button>
      {/*
        内容区必须常驻 DOM（只切 display）：xterm 宿主在挂载时就要存在，
        否则初始化 effect 会因 hostRef 为空被跳过，之后永远建不出终端。
      */}
      <div className="flex h-48 flex-col" style={{ display: isOpen ? "flex" : "none" }}>
        <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: "var(--bg)" }}>
          <div ref={hostRef} className="absolute inset-0" />
          {logs.length === 0 && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              暂无输出
            </div>
          )}
        </div>
        {running && (
          <div className="flex justify-end px-3 py-1">
            <Button variant="ghost" onClick={onCancel}>
              <span className="inline-flex items-center gap-1">
                <Square size={11} />
                取消
              </span>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
