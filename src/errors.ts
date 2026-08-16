// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * 全局错误上报：非良性的异步失败统一走这里，由 ErrorToasts 展示。
 * 避免各处静默 .catch(() => {}) 导致用户看不到失败原因。
 */

type Listener = (message: string) => void;

const listeners = new Set<Listener>();

export function reportError(message: string) {
  for (const l of listeners) {
    try {
      l(message);
    } catch {
      // 监听器自身异常不影响其他监听器
    }
  }
}

export function onError(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
