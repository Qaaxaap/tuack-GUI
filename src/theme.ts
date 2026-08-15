// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

export type AppTheme = "dark" | "light";

/** 把主题应用到 DOM（theme.css 按 `data-theme` 切换令牌），前端内容区配色由它驱动 */
export function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
}

export function normalizeTheme(value: string): AppTheme {
  return value === "light" ? "light" : "dark";
}
