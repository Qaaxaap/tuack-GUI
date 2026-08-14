// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Plus, Trash2, Combine, Split } from "lucide-react";
import Select from "./Select";
import Checkbox from "./Checkbox";

type DataRow =
  | { kind: "single"; id: number; score: number; subtask: number; input: string; output: string; dmk: string }
  | { kind: "bundle"; ids: number[]; score: number; subtask: number; dmk: string };

type Patch = { score?: number; subtask?: number; dmk?: string; input?: string; output?: string };

const DMK_OPTS = ["skip", "input", "output", "on"];

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
      });
    }
  }
  return rows;
}

function serialize(rows: DataRow[]): unknown[] {
  return rows.map((r) => {
    if (r.kind === "bundle") {
      return { id: r.ids, score: r.score, subtask: r.subtask, dmk: r.dmk };
    }
    return { id: r.id, score: r.score, subtask: r.subtask, input: r.input, output: r.output, dmk: r.dmk };
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
}

export default function TestDataEditor({ value, onChange }: Props) {
  const rows = parse(value);
  const [selected, setSelected] = useState<Set<number>>(new Set());

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
      { kind: "single", id, score: 0, subtask: 0, input: `${id}.in`, output: `${id}.ans`, dmk: "skip" },
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
    const merged: DataRow = { kind: "bundle", ids, score: first.score, subtask: first.subtask, dmk: first.dmk };
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

  const inputCls = "w-full rounded px-1.5 py-1 text-xs";
  const inputStyle = { backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button className="btn btn-ghost" onClick={addRow}>
          <span className="inline-flex items-center gap-1">
            <Plus size={13} />
            添加测试点
          </span>
        </button>
        <button className="btn btn-ghost" onClick={deleteSelected} disabled={selected.size === 0}>
          <span className="inline-flex items-center gap-1">
            <Trash2 size={13} />
            删除选中
          </span>
        </button>
        <button className="btn btn-ghost" onClick={mergeSelected} disabled={selected.size < 2}>
          <span className="inline-flex items-center gap-1">
            <Combine size={13} />
            合并选中
          </span>
        </button>
        <button className="btn btn-ghost" onClick={distribute}>
          均分 100 分
        </button>
      </div>

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
              <th className="w-10 p-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="p-1 text-center">
                  <Checkbox checked={selected.has(i)} onChange={() => toggle(i)} />
                </td>
                <td className="p-1" style={{ color: r.kind === "bundle" ? "var(--accent)" : "var(--text)" }}>
                  {r.kind === "single" ? r.id : `${r.ids[0]}–${r.ids[r.ids.length - 1]}`}
                </td>
                <td className="p-1">
                  <input type="number" className={inputCls} style={inputStyle} value={r.score}
                    onChange={(e) => updateRow(i, { score: Number(e.target.value) })} />
                </td>
                <td className="p-1">
                  <input type="number" className={inputCls} style={inputStyle} value={r.subtask}
                    onChange={(e) => updateRow(i, { subtask: Number(e.target.value) })} />
                </td>
                <td className="p-1">
                  {r.kind === "single" ? (
                    <input type="text" className={inputCls} style={inputStyle} value={r.input}
                      onChange={(e) => updateRow(i, { input: e.target.value })} />
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
                <td className="p-1">
                  {r.kind === "single" ? (
                    <input type="text" className={inputCls} style={inputStyle} value={r.output}
                      onChange={(e) => updateRow(i, { output: e.target.value })} />
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
                <td className="p-1">
                  <Select
                    value={r.dmk}
                    options={DMK_OPTS.map((o) => ({ value: o, label: o }))}
                    onChange={(v) => updateRow(i, { dmk: v })}
                  />
                </td>
                <td className="p-1 text-center">
                  {r.kind === "bundle" && (
                    <button onClick={() => splitRow(i)} title="拆分为单个测试点" style={{ color: "var(--text-muted)" }}>
                      <Split size={13} />
                    </button>
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
