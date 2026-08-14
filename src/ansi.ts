// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

export interface AnsiSegment {
  text: string;
  color?: string;
  bold?: boolean;
}

const FG = ["#000000", "#cd3131", "#0dbc79", "#e5e510", "#2472c8", "#bc3fbc", "#11a8cd", "#e5e5e5"];
const BRIGHT = ["#666666", "#f14c4c", "#23d18b", "#f5f543", "#3b8eea", "#d670d6", "#29b8db", "#ffffff"];

const SGR = /\x1b\[([0-9;]*)m/g;

/** 把一行带 ANSI 转义序列的文本，解析成 {text,color,bold} 片段；丢弃 \r 与光标控制序列 */
export function parseAnsi(text: string): AnsiSegment[] {
  // 丢弃 \r 和非 SGR 的转义序列（光标移动、清屏、隐藏光标等）
  const cleaned = text
    .replace(/\r/g, "")
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, (m) => (m.endsWith("m") ? m : ""))
    .replace(/\x1b\][^\x07]*(?:\x07|$)/g, "");

  const segments: AnsiSegment[] = [];
  let color: string | undefined;
  let bold = false;
  let last = 0;

  for (const m of cleaned.matchAll(SGR)) {
    const start = m.index ?? 0;
    if (start > last) {
      segments.push({ text: cleaned.slice(last, start), color, bold });
    }
    for (const raw of m[1].split(";")) {
      const c = Number(raw);
      if (c === 0) {
        color = undefined;
        bold = false;
      } else if (c === 1) {
        bold = true;
      } else if (c === 22) {
        bold = false;
      } else if (c >= 30 && c <= 37) {
        color = FG[c - 30];
      } else if (c >= 90 && c <= 97) {
        color = BRIGHT[c - 90];
      } else if (c === 39) {
        color = undefined;
      }
    }
    last = start + m[0].length;
  }

  if (last < cleaned.length) {
    segments.push({ text: cleaned.slice(last), color, bold });
  }

  return segments;
}
