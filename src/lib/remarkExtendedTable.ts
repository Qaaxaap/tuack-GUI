// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// 表格扩展：处理 tuack-ng 题面的 `<`（向左合并 colspan）与 `^`（向上合并 rowspan）。
// 来源：CNOI statement-generator（MIT）https://github.com/Mr-Python-in-China/cnoi-statement-generator/
// 见 THIRD_PARTY_LICENSES.md

import type mdast from "mdast";
import type { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";

declare module "mdast" {
  interface TableCellData {
    colspan?: number;
    rowspan?: number;
    removedByExtendedTable?: boolean;
  }
}

const remarkExtendedTable: Plugin<[], mdast.Root, mdast.Root> = () => {
  return (tree) => {
    if (tree.type !== "root") throw new TypeError(`Expected root node, got ${tree.type}`);
    visit(
      tree,
      (cell, index, parent) => {
        if (
          cell.type !== "tableCell" ||
          index === undefined ||
          parent === undefined ||
          cell.children[0]?.type !== "text" ||
          cell.children[0].value.trim() !== "<"
        )
          return;
        const prevCell = parent.children[index - 1];
        if (!prevCell || prevCell.type !== "tableCell") return;
        (cell.data ??= {}).removedByExtendedTable = true;
        (prevCell.data ??= {}).colspan ??= 1;
        prevCell.data.colspan += cell.data.colspan ?? 1;
        return SKIP;
      },
      true, // 逆序处理，向左合并时逐渐向左侧累加 colspan
    );
    visit(
      tree,
      (row, index, parent) => {
        if (row.type !== "tableRow" || index === undefined || parent === undefined) return;
        const prevRow = parent.children[index - 1];
        if (!prevRow || prevRow.type !== "tableRow") return;
        for (let i = 0; i < row.children.length; ++i) {
          const cell = row.children[i];
          if (
            cell.children[0]?.type !== "text" ||
            cell.children[0].value.trim() !== "^" ||
            cell.data?.removedByExtendedTable
          )
            continue;
          const prevCell = prevRow.children[i];
          if (!prevCell || prevCell.data?.removedByExtendedTable) continue;
          (cell.data ??= {}).removedByExtendedTable = true;
          (prevCell.data ??= {}).rowspan ??= 1;
          prevCell.data.rowspan += cell.data.rowspan ?? 1;
        }
        return SKIP;
      },
      true, // 逆序处理，向上合并时逐渐向上方累加 rowspan
    );
  };
};

export default remarkExtendedTable;
