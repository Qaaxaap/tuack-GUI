// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// rehype 插件：给块级元素标记来源 markdown 行号（data-line）。
// 配合 ren/preview 的 lineMap 实现编辑器与预览同步滚动。

/* eslint-disable @typescript-eslint/no-explicit-any */

type HastNode = any;

function walk(node: HastNode, fn: (n: HastNode) => void): void {
  if (!node || typeof node !== "object") return;
  fn(node);
  if (Array.isArray(node.children)) {
    for (const c of node.children) walk(c, fn);
  }
}

const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "table",
  "div",
]);

/** 给块级元素加 data-line（来源 markdown 行号），供同步滚动定位 */
export function rehypeLineMap(): (tree: HastNode) => void {
  return (tree) => {
    walk(tree, (n) => {
      if (n.type === "element" && BLOCK_TAGS.has(n.tagName)) {
        const line = n.position?.start?.line;
        if (typeof line === "number") {
          n.properties = { ...(n.properties ?? {}), dataLine: line };
        }
      }
    });
  };
}
