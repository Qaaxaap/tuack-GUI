// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// 同步滚动「活动侧」互斥锁：一次只允许一侧作为用户滚动的来源。
// 程序同步滚动对侧时，对侧不是活动侧 → 滚动事件被忽略，天然不回写（防死循环）。

export type SyncSide = "editor" | "preview";

let active: SyncSide | null = null;

/** 锁定活动侧（用户在该侧开始滚动） */
export function lockSide(side: SyncSide): void {
  active = side;
}

/** 释放锁（仅当当前锁属于本侧时释放，避免误放另一侧） */
export function releaseLock(side: SyncSide): void {
  if (active === side) active = null;
}

/** 本侧是否为当前活动侧（用户正在滚动的一侧） */
export function isActiveSide(side: SyncSide): boolean {
  return active === side;
}

/** 当前活动侧（调试用） */
export function currentSide(): SyncSide | null {
  return active;
}
