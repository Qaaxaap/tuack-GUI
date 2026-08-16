// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

import { useState } from "react";
import { Plus, Trash2, Combine, Split } from "lucide-react";
import Select from "./Select";
import Checkbox from "./Checkbox";

type DataRow =
  | { kind: "single"; id: number; score: number; subtask: number; input: string; output: string; dmk: string; args: string }
  | { kind: "bundle"; ids: number[]; score: number; subtask: number; dmk: string; args: string };

type Patch = { score?: number; subtask?: number; dmk?: string; input?: string; output?: string; args?: string };

function argsText(v: unknown): string {
  if (v === null || v === undefined) return "{}";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function parseArgs(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text; // 非法 JSON 原样保留，交由高级 JSON 修正
  }
}

function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

const DMK_OPTS = [
  { value: "skip", label: "忽略" },
  { value: "input", label: "只生成输入" },
  { value: "output", label: "只生成输出" },
  { value: "on", label: "启用" },
];

function parse(value: unknown): DataRow[] {
  if (!Array.isArray(value)) return [];
  const rows: DataRow[] = [];
  for (const item of value as Array<Record<string, unknown>>) {
    if (Array.isArray(item.id)) {
      rows.push({
        kind: "bundle",
        ids: (item.id as unknown[]).map(Number),
        score: Number(item.score ?? 0),
        subtask: Number(item.subtask ?? 0),
        dmk: String(item.dmk ?? "skip"),
        args: argsText(item.args),
      });
    } else {
      const id = Number(item.id ?? 0);
      rows.push({
        kind: "single",
        id,
        score: Number(item.score ?? 0),
        subtask: Number(item.subtask ?? 0),
        input: typeof item.input === "string" ? item.input : `${id}.in`,
        output: typeof item.output === "string" ? item.output : `${id}.ans`,
        dmk: String(item.dmk ?? "skip"),
        args: argsText(item.args),
      });
    }
  }
  return rows;
}

function serialize(rows: DataRow[]): unknown[] {
  return rows.map((r) => {
    if (r.kind === "bundle") {
      return { id: r.ids, score: r.score, subtask: r.subtask, dmk: r.dmk, args: parseArgs(r.args) };
    }
    return { id: r.id, score: r.score, subtask: r.subtask, input: r.input, output: r.output, dmk: r.dmk, args: parseArgs(r.args) };
  });
}

function maxId(rows: DataRow[]): number {
  let m = 0;
  for (const r of rows) {
    if (r.kind === "single") m = Math.max(m, r.id);
    else m = Math.max(m, ...r.ids);
  }
  return m;
}

interface Props {
  value: unknown;
  onChange: (v: unknown[]) => void;
  /** conf.json 的 subtasks 映射（子任务号 → 策略） */
  subtasks?: Record<string, string>;
  onSubtasksChange?: (v: Record<string, string>) => void;
}

const POLICY_OPTS = [
  { value: "sum", label: "求和" },
  { value: "max", label: "最大值" },
  { value: "min", label: "最小值" },
];

export default function TestDataEditor({ value, onChange, subtasks, onSubtasksChange }: Props) {
  const rows = parse(value);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // 展示策略的编号：subtasks 已有键 + 数据行里引用但未配置的
  const subtaskIds = (() => {
    const ids = new Set<string>(Object.keys(subtasks ?? {}));
    for (const r of rows) {
      ids.add(String(r.subtask));
    }
    return [...ids].sort((a, b) => Number(a) - Number(b));
  })();

  function commit(next: DataRow[]) {
    onChange(serialize(next));
  }

  function updateRow(i: number, patch: Patch) {
    const next = rows.map((r, idx) => (idx === i ? ({ ...r, ...patch } as DataRow) : r));
    commit(next);
  }

  function toggle(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  }

  function addRow() {
    const id = maxId(rows) + 1;
    commit([
      ...rows,
      { kind: "single", id, score: 0, subtask: 0, input: `${id}.in`, output: `${id}.ans`, dmk: "skip", args: "{}" },
    ]);
  }

  function deleteSelected() {
    commit(rows.filter((_, i) => !selected.has(i)));
    setSelected(new Set());
  }

  function mergeSelected() {
    const idxs = [...selected].sort((a, b) => a - b);
    if (idxs.length < 2) return;
    const consecutive = idxs.every((v, i) => i === 0 || v === idxs[i - 1] + 1);
    if (!consecutive) return;
    const ids: number[] = [];
    for (const i of idxs) {
      const r = rows[i];
      if (r.kind === "single") ids.push(r.id);
      else ids.push(...r.ids);
    }
    const first = rows[idxs[0]];
    const merged: DataRow = { kind: "bundle", ids, score: first.score, subtask: first.subtask, dmk: first.dmk, args: first.args };
    const next = [...rows.slice(0, idxs[0]), merged, ...rows.slice(idxs[idxs.length - 1] + 1)];
    commit(next);
    setSelected(new Set());
  }

  function splitRow(i: number) {
    const r = rows[i];
    if (r.kind !== "bundle") return;
    const singles: DataRow[] = r.ids.map((id) => ({
      kind: "single",
      id,
      score: r.score,
      subtask: r.subtask,
      input: `${id}.in`,
      output: `${id}.ans`,
      dmk: r.dmk,
      args: r.args,
    }));
    commit([...rows.slice(0, i), ...singles, ...rows.slice(i + 1)]);
  }

  function distribute() {
    const n = rows.length;
    if (n === 0) return;
    const base = Math.floor(100 / n);
    const rem = 100 % n;
    commit(rows.map((r, i) => ({ ...r, score: base + (i === n - 1 ? rem : 0) } as DataRow)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={addRow}>
          <span className="inline-flex items-center gap-1">
            <Plus size={13} />
            添加测试点
          </span>
        </Button>
        <Button variant="ghost" onClick={deleteSelected} disabled={selected.size === 0}>
          <span className="inline-flex items-center gap-1">
            <Trash2 size={13} />
            删除选中
          </span>
        </Button>
        <Button variant="ghost" onClick={mergeSelected} disabled={selected.size < 2}>
          <span className="inline-flex items-center gap-1">
            <Combine size={13} />
            合并选中
          </span>
        </Button>
        <Button variant="ghost" onClick={distribute}>
          均分 100 分
        </Button>
      </div>

      {onSubtasksChange && (
        <div>
          <div className="mb-1 text-xs font-medium" style={{ color: "var(--text)" }}>
            子任务策略
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 rounded border p-2" style={{ borderColor: "var(--border)" }}>
            {subtaskIds.map((id) => (
              <div key={id} className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {id === "0" ? "默认" : `子任务 ${id}`}
                </span>
                <div className="w-28">
                  <Select
                    value={subtasks?.[id] ?? "sum"}
                    options={POLICY_OPTS}
                    onChange={(v) => onSubtasksChange({ ...(subtasks ?? {}), [id]: v })}
                  />
                </div>
              </div>
            ))}
            {subtaskIds.length === 0 && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                无子任务（按默认策略求和）
              </span>
            )}
          </div>
        </div>
      )}

      <div className="overflow-auto rounded border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="w-8 p-1"></th>
              <th className="w-16 p-1 text-left" style={{ color: "var(--text-muted)" }}>编号</th>
              <th className="w-20 p-1" style={{ color: "var(--text-muted)" }}>分值</th>
              <th className="w-20 p-1" style={{ color: "var(--text-muted)" }}>子任务</th>
              <th className="p-1" style={{ color: "var(--text-muted)" }}>输入</th>
              <th className="p-1" style={{ color: "var(--text-muted)" }}>输出</th>
              <th className="w-24 p-1" style={{ color: "var(--text-muted)" }}>生成</th>
              <th className="p-1" style={{ color: "var(--text-muted)" }}>args</th>
              <th className="w-10 p-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="p-1 text-center">
                  <Checkbox checked={selected.has(i)} onChange={() => toggle(i)} />
                </td>
                <td className="p-1" style={{ color: r.kind === "bundle" ? "var(--text-muted)" : "var(--text)" }}>
                  {r.kind === "single" ? r.id : `${r.ids[0]}–${r.ids[r.ids.length - 1]}`}
                </td>
                <td className="p-1">
                  <Input type="number" className="h-6 px-1.5 text-xs" value={r.score}
                    onChange={(e) => updateRow(i, { score: Number(e.target.value) })} />
                </td>
                <td className="p-1">
                  <Input type="number" className="h-6 px-1.5 text-xs" value={r.subtask}
                    onChange={(e) => updateRow(i, { subtask: Number(e.target.value) })} />
                </td>
                <td className="p-1">
                  {r.kind === "single" ? (
                    <Input type="text" className="h-6 px-1.5 text-xs" value={r.input}
                      onChange={(e) => updateRow(i, { input: e.target.value })} />
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
                <td className="p-1">
                  {r.kind === "single" ? (
                    <Input type="text" className="h-6 px-1.5 text-xs" value={r.output}
                      onChange={(e) => updateRow(i, { output: e.target.value })} />
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
                <td className="p-1">
                  <Select
                    value={r.dmk}
                    options={DMK_OPTS}
                    onChange={(v) => updateRow(i, { dmk: v })}
                  />
                </td>
                <td className="p-1">
                  <Input
                    type="text"
                    className="h-6 px-1.5 text-xs"
                    style={isValidJson(r.args) ? undefined : { borderColor: "var(--danger)" }}
                    value={r.args}
                    title={isValidJson(r.args) ? undefined : "JSON 格式无效"}
                    onChange={(e) => updateRow(i, { args: e.target.value })}
                  />
                </td>
                <td className="p-1 text-center">
                  {r.kind === "bundle" && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => splitRow(i)} title="拆分为单个测试点">
                      <Split size={13} />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-3 text-center" style={{ color: "var(--text-muted)" }}>
                  暂无测试点，点「添加测试点」
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
