// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// RPC 会话管理器：维护 tuack-ng-rpc 的 session 生命周期，负责
// 工程树构建、config/get|set（带 revision 乐观并发）、dir<->scope 换算、
// 事件分发（run/*、ren/* 通知转发给评测/渲染运行器）。

import { rpc, RpcError } from "./client";
import type { WorkspaceOpenResult } from "./types";
import type { ContestNode, DayNode, ProblemNode, Project } from "../ipc/types";

// ---- 协议 scope 转义（与 tuack-ng-rpc PROTOCOL.md 一致）----

/** 转义 scope 段内的分隔字符：`/` -> `~1`、`~` -> `~0`（先 `~` 后 `/`） */
export function escapeSegment(s: string): string {
  return s.replace(/~/g, "~0").replace(/\//g, "~1");
}

/** 还原 scope 段：`~1` -> `/`、`~0` -> `~`（先 `~1` 后 `~0`） */
export function unescapeSegment(s: string): string {
  return s.replace(/~1/g, "/").replace(/~0/g, "~");
}

/**
 * 服务端返回的相对 path（已按层级段转义）-> 真实相对路径。
 * 层级的 `/` 保留，段内 `~1`/`~0` 还原；`..` 是 key 真实内容，保留不清除。
 */
function unescapePath(path: string): string {
  return path.split("/").map(unescapeSegment).join("/");
}

/** dir（绝对路径）-> scope。优先用构建树时记录的映射；未命中则回退朴素相对路径。 */
export function scopeFor(root: string, dir: string): string {
  const rel = relativeRaw(root, dir);
  if (rel === null) {
    throw new Error(`路径不在工程内：${dir}`);
  }
  if (rel === "") return "contest";
  // 朴素回退：逐段转义，层级分隔 `/` 保留（`..` 不清除）。
  // 注意：key 内部含 `/` 时无法在此反推层级，应由 buildProject 的映射提供。
  return rel.split(/[\\/]/).map(escapeSegment).join("/");
}

/** 计算 from 到 to 的相对路径（不做 `..` 解析，保留原样）；不在其下返回 null */
function relativeRaw(from: string, to: string): string | null {
  const norm = (p: string) => {
    let s = p.replace(/\\/g, "/").replace(/\/+$/, "");
    if (s === "") s = "/";
    return s;
  };
  const a = norm(from);
  const b = norm(to);
  if (b === a) return "";
  if (b.startsWith(a + "/")) return b.slice(a.length + 1);
  return null;
}

/** `file://` URI -> 文件系统路径 */
function uriToPath(uri: string): string {
  if (uri.startsWith("file://")) {
    try {
      return decodeURIComponent(uri.replace(/^file:\/\//, ""));
    } catch {
      return uri.replace(/^file:\/\//, "");
    }
  }
  return uri;
}

/** 绝对路径 -> `file://` URI */
function pathToUri(path: string): string {
  return `file://${path.replace(/\\/g, "/")}`;
}

/**
 * root 与转义后的相对 path 拼出绝对目录。
 * path 逐段反转义（`~1`/`~0`），层级 `/` 保留，`..` 不清除。
 */
function joinDir(root: string, rel: string): string {
  const real = unescapePath(rel);
  const r = root.replace(/[\\/]+$/, "");
  return `${r}/${real}`;
}

/** config/get 返回的配置 + session 内 revision */
export interface ConfigData {
  revision: number;
  config: Record<string, unknown>;
}

export type RpcEventHandler = (method: string, params: Record<string, unknown>) => void;

/** 轮询等待条件成立（配合事件回调置位，避免错过事件） */
export function waitUntil(
  cond: () => boolean,
  timeoutMs: number,
  message = "操作超时",
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (cond()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(message));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

export class RpcSessionManager {
  private sessionId: string | null = null;
  private root: string | null = null;
  private contestName = "";
  private contestTitle = "";
  /** scope -> revision（session-global，用于 config/set 乐观并发校验） */
  private revisions = new Map<string, number>();
  /** dir -> scope（构建工程树时按服务端返回的 path 记录，含段转义） */
  private scopes = new Map<string, string>();
  private handlers = new Set<RpcEventHandler>();

  get active(): boolean {
    return this.sessionId !== null;
  }

  get sid(): string {
    if (!this.sessionId) throw new Error("尚未打开工程");
    return this.sessionId;
  }

  get projectRoot(): string {
    if (!this.root) throw new Error("尚未打开工程");
    return this.root;
  }

  /** 订阅服务端事件（run/*、ren/* 等 Notification） */
  onEvent(fn: RpcEventHandler): () => void {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }

  private dispatch(method: string, params: Record<string, unknown>): void {
    for (const fn of this.handlers) {
      try {
        fn(method, params);
      } catch {
        // 监听器异常不影响其他监听器
      }
    }
  }

  /** 连接 rpc 子进程并绑定事件分发（幂等） */
  async ensureConnected(): Promise<void> {
    if (rpc.connected) {
      // 已连接：避免重复订阅
      return;
    }
    await rpc.connect();
    rpc.onEvent((method, params) => this.dispatch(method, params));
  }

  /** 打开工程：workspace/open 建 session 并构建工程树 */
  async open(uriPath: string): Promise<Project> {
    await this.ensureConnected();
    if (this.sessionId) {
      await this.close();
    }
    const res = await rpc.workspaceOpen(pathToUri(uriPath));
    if (!res.contest) {
      throw new Error("所选目录不是有效的 tuack-ng 工程（无 conf.json）");
    }
    this.sessionId = res.sessionId;
    // 工程根以 contest.uri 为准（沿目录向上发现的根）
    const contestUri = res.contest.uri;
    this.root = uriToPath(contestUri);
    this.contestName = res.contest.name;
    this.contestTitle = this.contestName;
    this.revisions.clear();
    this.scopes.clear();
    return this.buildProject(res);
  }

  /** 重建工程树（gen / 增删节点后刷新） */
  async refreshProject(): Promise<Project> {
    if (!this.sessionId || !this.root) throw new Error("尚未打开工程");
    // 重开一个 session 让服务端缓存与磁盘同步（等价重新采纳配置）
    const res = await rpc.workspaceOpen(pathToUri(this.root));
    await rpc.workspaceClose(this.sessionId).catch(() => {});
    this.sessionId = res.sessionId;
    this.revisions.clear();
    this.scopes.clear();
    return this.buildProject(res);
  }

  private async buildProject(res: WorkspaceOpenResult): Promise<Project> {
    const root = this.root!;
    this.scopes.set(root, "contest");
    const days: DayNode[] = [];
    for (const d of res.contest!.days) {
      // day key 单段转义后作为 scope（key 内 `/` -> `~1`）
      const dayScope = escapeSegment(d);
      this.scopes.set(joinDir(root, d), dayScope);
      let title = d;
      try {
        const cfg = await rpc.configGet(this.sid, dayScope);
        if (typeof cfg.config["title"] === "string" && cfg.config["title"]) {
          title = cfg.config["title"] as string;
        }
      } catch {
        // day 无有效配置时退回名字
      }
      const problems: ProblemNode[] = [];
      try {
        const pl = await rpc.problemList(this.sid, dayScope);
        for (const p of pl.problems) {
          const pdir = joinDir(root, p.path);
          // 服务端 path 已按段转义，可直接作为 scope/problem 参数
          this.scopes.set(pdir, p.path);
          problems.push({ name: p.name, title: p.title, dir: pdir });
        }
      } catch {
        // 单个 day 失败不阻塞整棵树
      }
      days.push({ name: d, title, dir: joinDir(root, d), problems });
    }
    const contest: ContestNode = {
      name: this.contestName,
      title: this.contestTitle,
      dir: root,
      days,
    };
    return { root, contest };
  }

  /** 关闭工程（workspace/close，取消该 session 下所有 run/ren 任务） */
  async close(): Promise<void> {
    if (this.sessionId) {
      const id = this.sessionId;
      this.sessionId = null;
      this.root = null;
      this.revisions.clear();
      this.scopes.clear();
      try {
        await rpc.workspaceClose(id);
      } catch {
        // 服务端可能已关闭
      }
    }
  }

  /** 节点 dir -> 配置 scope（优先构建树时记录的映射，含段转义） */
  scope(dir: string): string {
    const recorded = this.scopes.get(dir);
    if (recorded !== undefined) return recorded;
    return scopeFor(this.projectRoot, dir);
  }

  /** 题目 dir -> `<day>/<problem>` 标识（供 run/ren 使用，含段转义） */
  problemId(dir: string): string {
    const s = this.scope(dir);
    const parts = s.split("/");
    if (parts.length !== 2) {
      throw new Error(`不是题目节点：${dir}`);
    }
    return s;
  }

  // ---- config ----

  /** 读取配置（config/get），记录 revision 供后续 set 校验 */
  async getConfig(dir: string): Promise<ConfigData> {
    const scope = this.scope(dir);
    const res = await rpc.configGet(this.sid, scope);
    this.revisions.set(scope, res.revision);
    return { revision: res.revision, config: res.config };
  }

  /** 保存配置（config/set，携带 revision 乐观并发），失败抛 RpcError(-32007) */
  async setConfig(dir: string, config: Record<string, unknown>): Promise<void> {
    const scope = this.scope(dir);
    const revision = this.revisions.get(scope);
    const res = await rpc.configSet(this.sid, scope, "", config, revision);
    this.revisions.set(scope, res.revision);
  }

  /** 供 UI 展示的 revision 冲突错误提示 */
  static isRevisionConflict(e: unknown): boolean {
    return e instanceof RpcError && e.code === -32007;
  }
}

/** 全局单例：整个应用共享一条 RPC 连接与一个 workspace session */
export const session = new RpcSessionManager();
