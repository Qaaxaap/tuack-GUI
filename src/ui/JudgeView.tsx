// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// 评测视图：通过 RPC run/* 编排，支持多个测试者（题目 `tests` 的 key，
// 如 std / brute），逐个 run/create + judge，流式逐点更新结果。

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Play } from "lucide-react";
import { Button } from "../components/ui/button";
import { getLatestResults, loadPersistedResults, runJudge, type JudgePoint } from "../rpc/runner";
import { session } from "../rpc/session";
import type { JudgeResult, ScoreResult } from "../rpc/types";

type JudgeState = "idle" | "waiting" | "preparing" | "judging" | "done" | "error";

export interface JudgeTrigger {
  dir: string;
  target: "data" | "sample";
  seq: number;
}

interface Props {
  dir: string;
  /** 外部触发（命令面板 test 命令）：dir 匹配且 seq 递增时自动开始 */
  trigger: JudgeTrigger | null;
}

interface TesterRun {
  tester: string;
  state: JudgeState;
  points: JudgePoint[];
  judged: JudgeResult[];
  score: ScoreResult | null;
  error: string | null;
  logs: string[];
}

function emptyRun(tester: string): TesterRun {
  return { tester, state: "idle", points: [], judged: [], score: null, error: null, logs: [] };
}

function statusColor(s: string): string {
  if (s === "AC") return "#23d18b";
  if (s === "WA") return "#f14c4c";
  if (s === "TLE" || s === "MLE") return "#3b8eea";
  if (s === "RE") return "#d670d6";
  if (s === "UKE" || s === "FE") return "#e5e510";
  if (s.startsWith("PC")) return "#e5e510";
  return "var(--foreground)";
}

const STATE_LABEL: Record<JudgeState, string> = {
  idle: "待评测",
  waiting: "等待中",
  preparing: "编译中…",
  judging: "评测中…",
  done: "完成",
  error: "失败",
};

/** 比较实际得分与预期条件（如 `">= 60"` / `"== 100"`，多个条件需全部满足）。
 *  直接 eval 求值 `actual condition`，与 tuack-ng 的 evalexpr 语义一致。 */
function matchesExpected(actual: number, expected: unknown): boolean {
  const check = (cond: string): boolean => {
    try {
      return Boolean(eval(`${actual} ${cond}`));
    } catch {
      return false;
    }
  };
  if (Array.isArray(expected)) return expected.every((e) => check(String(e)));
  return check(String(expected));
}

function TesterTable({ run }: { run: TesterRun }) {
  const judgedMap = new Map(run.judged.map((r) => [r.testId, r]));
  const rows: { id: string; label: string; status: string; score: string; time: string; memory: string; msg: string }[] =
    run.points.map((p) => {
      const r = judgedMap.get(p.id);
      return {
        id: p.id,
        label: p.subtask > 0 ? `#${p.id} (子任务 ${p.subtask})` : `#${p.id}`,
        status: r ? r.status : "—",
        score: r ? `${(r.score * r.fullScore).toFixed(r.fullScore % 1 === 0 ? 0 : 2)} / ${r.fullScore}` : "—",
        time: r?.timeMs != null ? `${r.timeMs} ms` : "—",
        memory: r?.memoryBytes != null ? `${(r.memoryBytes / 1024 / 1024).toFixed(2)} MiB` : "—",
        msg: r?.message ?? "",
      };
    });
  return (
    <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          {["测试点", "状态", "得分", "时间", "空间", "信息"].map((h) => (
            <th key={h} className="p-1 text-left" style={{ color: "var(--muted-foreground)" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
            <td className="p-1" style={{ color: "var(--muted-foreground)" }}>
              {r.label}
            </td>
            <td className="p-1" style={{ color: statusColor(r.status) }}>
              {r.status}
            </td>
            <td className="p-1">{r.score}</td>
            <td className="p-1">{r.time}</td>
            <td className="p-1">{r.memory}</td>
            <td className="p-1" style={{ color: r.status === "UKE" ? "var(--destructive)" : "var(--muted-foreground)" }}>
              {r.msg}
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className="p-3 text-center" style={{ color: "var(--muted-foreground)" }}>
              暂无数据点
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function JudgeView({ dir, trigger }: Props) {
  const [testers, setTesters] = useState<string[]>([]);
  const [target, setTarget] = useState<"data" | "sample">("data");
  const [runs, setRuns] = useState<Record<string, TesterRun>>({});
  const [running, setRunning] = useState(false);
  /** tester -> 预期条件（题目配置 tests.expected） */
  const [expectedMap, setExpectedMap] = useState<Record<string, unknown>>({});
  /** tester -> 是否折叠表格 */
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // 切换节点：重读测试者列表（题目配置 tests 的 key），并从持久化/缓存恢复上次结果
  useEffect(() => {
    let alive = true;
    setRunning(false);
    // 立即清空旧题目的状态，避免旧的 expectedMap 与切换后的 runs 组合误判「不符合预期」
    setExpectedMap({});
    setTesters([]);
    setRuns({});
    setTarget("data");
    (async () => {
      await loadPersistedResults(session.projectRoot);
      if (!alive) return;
      const cfgData = await session.getConfig(dir).catch(() => null);
      if (!alive || !cfgData) return;
      const t = cfgData.config["tests"];
      const tests =
        t && typeof t === "object" && !Array.isArray(t)
          ? (t as Record<string, { expected?: unknown }>)
          : {};
      const keys = Object.keys(tests);
      setTesters(keys);
      const exp: Record<string, unknown> = {};
      for (const k of keys) {
        const e = tests[k]?.expected;
        if (e !== undefined) exp[k] = e;
      }
      setExpectedMap(exp);
      setCollapsed({});
    })().catch(() => {
      if (alive) {
        setTesters([]);
        setRuns({});
      }
    });
    return () => {
      alive = false;
    };
  }, [dir]);

  // 按目标（正式数据 / 样例）恢复缓存结果：切换 target 时互不覆盖
  useEffect(() => {
    const cached = getLatestResults(dir, target);
    const restored: Record<string, TesterRun> = {};
    for (const c of cached) {
      restored[c.tester] = {
        tester: c.tester,
        state: "done",
        points: c.judged.map((r) => ({ id: r.testId, score: 0, subtask: 0 })),
        judged: c.judged,
        score: c.score,
        error: null,
        logs: [],
      };
    }
    setRuns(restored);
  }, [dir, target]);

  const setRun = useCallback((tester: string, upd: (r: TesterRun) => TesterRun) => {
    setRuns((prev) => ({ ...prev, [tester]: upd(prev[tester] ?? emptyRun(tester)) }));
  }, []);

  const start = useCallback(
    async (t: "data" | "sample", names: string[]) => {
      if (running) return;
      const list = names.length > 0 ? names : testers;
      if (list.length === 0) {
        setRuns({});
        return;
      }
      setTarget(t);
      setRunning(true);
      // 只重置本次要测的测试者，保留其他测试者已有的记录（避免「只测本用例」清掉别的用例）
      const init: Record<string, TesterRun> = {};
      list.forEach((n, i) => {
        init[n] = { ...emptyRun(n), state: i === 0 ? "preparing" : "waiting" };
      });
      setRuns((prev) => ({ ...prev, ...init }));
      for (let i = 0; i < list.length; i++) {
        const n = list[i];
        // 轮到当前测试者：waiting -> preparing
        setRun(n, (r) => ({ ...r, state: "preparing", logs: [] }));
        try {
          await runJudge(dir, t, n, {
            onLog: (text) => setRun(n, (r) => ({ ...r, logs: [...r.logs, text] })),
            onPoints: (pts) => setRun(n, (r) => ({ ...r, points: pts, state: "judging" })),
            onPoint: (jr) => setRun(n, (r) => ({ ...r, judged: [...r.judged, jr] })),
            onScore: (s) => setRun(n, (r) => ({ ...r, score: s, state: "done" })),
          });
        } catch (e) {
          setRun(n, (r) => ({ ...r, state: "error", error: String(e) }));
        }
      }
      setRunning(false);
    },
    [dir, running, testers, setRun],
  );

  // 命令面板 test 命令触发
  useEffect(() => {
    if (trigger && trigger.dir === dir && trigger.seq > 0) {
      start(trigger.target, testers);
    }
  }, [trigger, dir, start, testers]);

  const doneCount = Object.values(runs).filter((r) => r.state === "done").length;
  const failedCount = Object.values(runs).filter((r) => r.state === "error").length;

  const targetLabel = (t: "data" | "sample") => (t === "data" ? "正式数据" : "样例");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex h-11 shrink-0 flex-wrap items-center gap-2 px-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
          评测
        </span>
        {running ? (
          <span className="text-xs" style={{ color: "var(--primary)" }}>
            {Object.values(runs).some((r) => r.state === "preparing")
              ? "编译中…"
              : Object.values(runs).some((r) => r.state === "judging")
                ? "评测中…"
                : "等待中…"}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {doneCount + failedCount > 0
              ? `完成 ${doneCount}${failedCount > 0 ? ` · 失败 ${failedCount}` : ""}`
              : "待评测"}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* 数据目标切换 */}
          <div className="flex items-center rounded border" style={{ borderColor: "var(--border)" }}>
            {(["data", "sample"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  // 已选中时无操作：避免 setRuns({}) 清空记录而 target 不变、恢复 effect 不触发
                  if (t === target) return;
                  // 先清空，避免旧目标的结果参与新目标的预期检查（闪烁警告）
                  setRuns({});
                  setTarget(t);
                }}
                disabled={running}
                className="px-2 py-1 text-[11px]"
                style={
                  target === t
                    ? { backgroundColor: "var(--primary)", color: "#fff" }
                    : { color: "var(--muted-foreground)" }
                }
              >
                {targetLabel(t)}
              </button>
            ))}
          </div>
          {/* 全部测评：测所有测试者 */}
          <Button
            variant="default"
            size="sm"
            disabled={running}
            onClick={() => start(target, testers)}
          >
            <Play className="mr-1 h-3.5 w-3.5" />
            全部测评
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {testers.length === 0 && (
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            题目未配置测试代码（tests），无法评测
          </div>
        )}

        {(() => {
          // 预期比较仅针对正式数据（样例不参与）
          if (target !== "data") return null;
          const mismatched = testers.filter((t) => {
            const run = runs[t];
            if (!run || run.state !== "done" || !run.score?.report || expectedMap[t] === undefined) {
              return false;
            }
            return !matchesExpected(run.score.report.total, expectedMap[t]);
          });
          if (mismatched.length === 0) return null;
          return (
            <div
              className="mb-3 rounded border px-3 py-2 text-xs"
              style={{ borderColor: "var(--warning)" }}
            >
              <div className="font-bold" style={{ color: "var(--warning)" }}>
                以下测试用例不符合预期
              </div>
              <div className="mt-1 font-medium leading-5" style={{ color: "var(--foreground)" }}>
                {mismatched.map((t) => (
                  <div key={t}>· {t}</div>
                ))}
              </div>
            </div>
          );
        })()}

        {testers.map((t) => {
          const run = runs[t] ?? emptyRun(t);
          const isCollapsed = !!collapsed[t];
          const report = run.score?.report;
          const bad =
            target === "data" &&
            run.state === "done" &&
            report != null &&
            expectedMap[t] !== undefined &&
            !matchesExpected(report.total, expectedMap[t]);
          return (
            <div key={t} className="mb-5">
              <div className="mb-1 flex items-center gap-2">
                <button
                  onClick={() => setCollapsed((p) => ({ ...p, [t]: !p[t] }))}
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {isCollapsed ? (
                    <ChevronRight size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                  {run.tester}
                </button>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {targetLabel(target)} · {STATE_LABEL[run.state]}
                  {run.state === "judging" && run.points.length > 0
                    ? `（${run.judged.length}/${run.points.length}）`
                    : ""}
                </span>
                {report && (
                  <span className="text-xs font-medium" style={{ color: bad ? "var(--warning)" : "var(--foreground)" }}>
                    {report.total}/{report.fullScore}
                  </span>
                )}
                {bad && (
                  <span className="text-xs" style={{ color: "var(--warning)" }}>
                    不符合预期
                  </span>
                )}
                {run.state === "error" && (
                  <span className="text-xs font-bold" style={{ color: "var(--warning)" }}>
                    CE
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    disabled={running}
                    onClick={() => start(target, [t])}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    只测本用例
                  </Button>
                </div>
              </div>
              {!isCollapsed && (
                <>
                  <div className="overflow-auto rounded border" style={{ borderColor: "var(--border)" }}>
                    <TesterTable run={run} />
                  </div>
                  {/* CE：编译错误信息显示在该测试用例底下 */}
                  {run.state === "error" && (run.logs.length > 0 || run.error) && (
                    <div
                      className="mt-1.5 rounded border px-2.5 py-1.5 text-[11px] leading-5"
                      style={{ borderColor: "var(--warning)" }}
                    >
                      <span className="mr-1 font-bold" style={{ color: "var(--warning)" }}>
                        CE
                      </span>
                      <span className="font-bold" style={{ color: "var(--warning)" }}>
                        编译错误
                      </span>
                      <div
                        className="mt-1 font-mono whitespace-pre-wrap"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {run.logs.length > 0 ? run.logs.join("\n") : run.error}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
