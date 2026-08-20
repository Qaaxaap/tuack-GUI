// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// rehype 插件：在 hast 层处理 tuack-ng 题面表格的 `^` 合并单元格。
// `^` 单元格引用上方同列单元格，合并为 rowspan 延伸（非克隆文本）。
// （remark-rehype 的 tableCell handler 不生效——tableRow handler 内联处理单元格，
//   故在 hast 层处理最可靠。）

/* eslint-disable @typescript-eslint/no-explicit-any */

type HastNode = any;

function walk(node: HastNode, fn: (n: HastNode) => void): void {
  if (!node || typeof node !== "object") return;
  fn(node);
  if (Array.isArray(node.children)) {
    for (const c of node.children) walk(c, fn);
  }
}

function textOf(el: HastNode): string {
  let s = "";
  for (const ch of el.children ?? []) {
    if (ch.type === "text") s += ch.value ?? "";
    else if (ch.type === "element") s += textOf(ch);
  }
  return s;
}

const isCell = (n: HastNode) =>
  n && n.type === "element" && (n.tagName === "td" || n.tagName === "th");

export function rehypeTableMerge(): (tree: HastNode) => void {
  return (tree) => {
    const tables: HastNode[] = [];
    walk(tree, (n) => {
      if (n.type === "element" && n.tagName === "table") tables.push(n);
    });

    for (const table of tables) {
      const trs: HastNode[] = [];
      walk(table, (n) => {
        if (n.type === "element" && n.tagName === "tr") trs.push(n);
      });
      // 原始网格（含占位单元格，索引稳定）
      const grid = trs.map((tr) => (tr.children ?? []).filter(isCell));
      const texts = grid.map((row) => row.map(textOf));

      // `<`：向左合并（colspan）
      for (let r = 0; r < grid.length; r++) {
        for (let c = 1; c < grid[r].length; c++) {
          if (texts[r][c].trim() !== "<") continue;
          const left = grid[r][c - 1];
          if (!left) continue;
          const cur = Number(left.properties?.colSpan) || 1;
          left.properties = { ...(left.properties ?? {}), colSpan: cur + 1 };
          trs[r].children = (trs[r].children ?? []).filter((ch: HastNode) => ch !== grid[r][c]);
        }
      }

      // `^`：向上合并（rowspan）
      for (let r = 1; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (texts[r][c].trim() !== "^") continue;
          // 向上找最近非 `^` 的单元格
          let up = r - 1;
          while (up >= 0 && grid[up][c] && texts[up][c].trim() === "^") up--;
          if (up >= 0 && grid[up][c]) {
            const target = grid[up][c];
            const cur = Number(target.properties?.rowSpan) || 1;
            target.properties = { ...(target.properties ?? {}), rowSpan: cur + 1 };
            // 从该行移除 `^` 单元格（rowspan 延伸覆盖此位置）
            trs[r].children = (trs[r].children ?? []).filter((ch: HastNode) => ch !== grid[r][c]);
          }
        }
      }
    }
  };
}
