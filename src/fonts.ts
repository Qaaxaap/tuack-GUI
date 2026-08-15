// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

const UI_FALLBACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
const MONO_FALLBACK =
  '"Maple Mono NF CN", "JetBrains Mono", ui-monospace, "Cascadia Code", Consolas, monospace';

/** 把用户配置的字体应用到 CSS 变量；留空则回退到默认字体链。 */
export function applyFonts(uiFont: string, monoFont: string) {
  const root = document.documentElement;
  root.style.setProperty("--font-ui", uiFont ? `"${uiFont}", ${UI_FALLBACK}` : UI_FALLBACK);
  root.style.setProperty("--font-mono", monoFont ? `"${monoFont}", ${MONO_FALLBACK}` : MONO_FALLBACK);
  window.dispatchEvent(new CustomEvent("tuack-styles-changed"));
}
