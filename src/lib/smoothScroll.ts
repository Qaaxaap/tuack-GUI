// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// 短促平滑滚动：rAF 插值，时长可控（浏览器 scrollTo smooth 时长不可控，
// 过长导致同步滚动「跟不上」）。easeInOutQuad 缓动。

export function smoothScrollTo(el: HTMLElement, targetTop: number, duration = 150): void {
  const startTop = el.scrollTop;
  const delta = targetTop - startTop;
  if (delta === 0 || duration <= 0) {
    el.scrollTop = targetTop;
    return;
  }
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    el.scrollTop = startTop + delta * eased;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
