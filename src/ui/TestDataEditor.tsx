// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

import { useState } from "react";
import { Plus, Trash2, Combine, Split, Pencil, Divide, ArrowUp, ArrowDown } from "lucide-react";
import Select from "./Select";
import Checkbox from "./Checkbox";
import ArgsEditorDialog from "./ArgsEditorDialog";

type DataRow =
  | { kind: "single"; id: number; score: number; subtask: number; input: string; output: string; dmk: string; args: Record<string, unknown> }
  | { kind: "bundle"; ids: number[]; score: number; subtask: number; dmk: string; args: Record<string, unknown> };

type Patch = { score?: number; subtask?: number; dmk?: string; input?: string; output?: string; args?: Record<string, unknown> };



const DMK_OPTS = [
  { value: "default", label: "默认" },
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
        dmk: String(item.dmk ?? "default"),
        args:
          item.args && typeof item.args === "object"
            ? ({ ...(item.args as Record<string, unknown>) })
            : {},
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
        dmk: String(item.dmk ?? "default"),
        args:
          item.args && typeof item.args === "object"
            ? ({ ...(item.args as Record<string, unknown>) })
            : {},
      });
    }
  }
  return rows;
}

function serialize(rows: DataRow[]): unknown[] {
  return rows.map((r) => {
    // dmk 为「默认」时不写字段（跟随题目级默认），其余按枚举值写入
    const dmk = r.dmk !== "default" ? { dmk: r.dmk } : {};
    if (r.kind === "bundle") {
      return { id: r.ids, score: r.score, subtask: r.subtask, ...dmk, args: r.args };
    }
    return { id: r.id, score: r.score, subtask: r.subtask, input: r.input, output: r.output, ...dmk, args: r.args };
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
  /** 窄屏模式：隐藏行操作栏（上移/下移/拆分/删除），改用顶部统一操作 */
  narrow?: boolean;
}

const POLICY_OPTS = [
  { value: "sum", label: "求和" },
  { value: "max", label: "最大值" },
  { value: "min", label: "最小值" },
];

export default function TestDataEditor({ value, onChange, subtasks, onSubtasksChange, narrow = false }: Props) {
  const rows = parse(value);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [argsRow, setArgsRow] = useState<number | null>(null);

  // 策略区声明的子任务编号（测试点子任务只能从这些里选）
  const declared = Object.keys(subtasks ?? {})
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  function commit(next: DataRow[]) {
    onChange(serialize(next));
  }

  function updateRow(i: number, patch: Patch) {
    const next = rows.map((r, idx) => (idx === i ? ({ ...r, ...patch } as DataRow) : r));
    commit(next);
  }

  /** 测试点子任务下拉选项：仅策略声明的子任务；行引用未声明编号时临时补一项 */
  function subtaskOptions(sel: number) {
    const opts = declared.map((id) => ({ value: String(id), label: `子任务 ${id}` }));
    if (!opts.some((o) => o.value === String(sel))) {
      opts.push({ value: String(sel), label: `子任务 ${sel}（未配置）` });
    }
    return opts;
  }

  function addSubtask() {
    const max = declared.length ? declared[declared.length - 1] : 0;
    onSubtasksChange?.({ ...(subtasks ?? {}), [String(max + 1)]: "sum" });
  }

  function removeSubtask(id: number) {
    const next = { ...(subtasks ?? {}) };
    delete next[String(id)];
    onSubtasksChange?.(next);
    // 引用被删子任务的测试点回落到剩余第一个子任务（无则保留 0 占位，下拉会标「未配置」）
    const remaining = Object.keys(next)
      .map(Number)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    const fallback = remaining[0] ?? 0;
    if (rows.some((r) => r.subtask === id)) {
      commit(rows.map((r) => (r.subtask === id ? ({ ...r, subtask: fallback } as DataRow) : r)));
    }
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
      { kind: "single", id, score: 0, subtask: 0, input: `${id}.in`, output: `${id}.ans`, dmk: "default", args: {} },
    ]);
  }

  function deleteSelected() {
    commit(rows.filter((_, i) => !selected.has(i)));
    setSelected(new Set());
  }

  function deleteRow(i: number) {
    commit(rows.filter((_, idx) => idx !== i));
    setSelected((prev) => {
      const next = new Set<number>();
      for (const x of prev) {
        if (x < i) next.add(x);
        else if (x > i) next.add(x - 1);
      }
      return next;
    });
  }

  /** 上下移调整测试点顺序（bundle 视为整行移动），并同步选中索引 */
  function moveRow(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
    setSelected((prev) => {
      const nextSet = new Set<number>();
      for (const x of prev) {
        if (x === i) nextSet.add(j);
        else if (x === j) nextSet.add(i);
        else nextSet.add(x);
      }
      return nextSet;
    });
  }

  /** 顶部统一上移/下移：仅允许单选时移动该行 */
  function moveSelected(dir: -1 | 1) {
    if (selected.size !== 1) return;
    const i = [...selected][0];
    moveRow(i, dir);
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

  /** 按测试点总数均分 100 分：bundle 的 score 是「每个点的分值」，故与单点一样按 base 均分；
   *  余数加在第一个单点上（全为合并点时加在最后一个合并行） */
  function distribute() {
    if (rows.length === 0) return;
    const count = rows.reduce((sum, r) => sum + (r.kind === "bundle" ? r.ids.length : 1), 0);
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const rem = 100 % count;
    commit(
      rows.map((r, i) => {
        let score = base;
        if (rem > 0) {
          if (r.kind === "single" && !rows.slice(0, i).some((x) => x.kind === "single")) {
            score += rem;
          } else if (
            r.kind === "bundle" &&
            !rows.some((x) => x.kind === "single") &&
            i === rows.length - 1
          ) {
            score += rem;
          }
        }
        return { ...r, score } as DataRow;
      }),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
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
        {narrow && (
          <Button
            variant="ghost"
            onClick={() => moveSelected(-1)}
            disabled={selected.size !== 1 || Math.min(...selected) === 0}
          >
            <span className="inline-flex items-center gap-1">
              <ArrowUp size={13} />
              上移
            </span>
          </Button>
        )}
        {narrow && (
          <Button
            variant="ghost"
            onClick={() => moveSelected(1)}
            disabled={selected.size !== 1 || Math.max(...selected) === rows.length - 1}
          >
            <span className="inline-flex items-center gap-1">
              <ArrowDown size={13} />
              下移
            </span>
          </Button>
        )}
        <Button variant="ghost" onClick={mergeSelected} disabled={selected.size < 2}>
          <span className="inline-flex items-center gap-1">
            <Combine size={13} />
            合并选中
          </span>
        </Button>
        <Button variant="ghost" onClick={distribute}>
          <span className="inline-flex items-center gap-1">
            <Divide size={13} />
            均分 100 分
          </span>
        </Button>
      </div>

      {onSubtasksChange && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
              子任务策略
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={addSubtask}>
              <Plus size={12} className="mr-1" />
              添加子任务
            </Button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 rounded border p-2" style={{ borderColor: "var(--border)" }}>
            {declared.map((id) => (
              <div key={id} className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  子任务 {id}
                </span>
                <div className="w-28">
                  <Select
                    value={subtasks?.[String(id)] ?? "sum"}
                    options={POLICY_OPTS}
                    onChange={(v) => onSubtasksChange({ ...(subtasks ?? {}), [String(id)]: v })}
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSubtask(id)} title="删除该子任务">
                  <Trash2 size={12} />
                </Button>
              </div>
            ))}
            {declared.length === 0 && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                无子任务（测试点默认按求和计分），点「添加子任务」
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
              <th className="w-12 p-1 text-center" style={{ color: "var(--text-muted)" }}>编号</th>
              <th className="w-16 p-1 text-center" style={{ color: "var(--text-muted)" }}>分值</th>
              <th className="w-20 p-1 text-center" style={{ color: "var(--text-muted)" }}>子任务</th>
              <th className="w-24 p-1 text-center" style={{ color: "var(--text-muted)" }}>输入</th>
              <th className="w-24 p-1 text-center" style={{ color: "var(--text-muted)" }}>输出</th>
              <th className="w-24 p-1 text-center" style={{ color: "var(--text-muted)" }}>生成</th>
              <th className="w-20 p-1 text-center" style={{ color: "var(--text-muted)" }}>args</th>
              {!narrow && <th className="w-28 p-1"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              // args 展开面板：插在该行（bundle 为整组）之后，用背景色区分归属
              const panel =
                argsRow === i ? (
                  <tr key={`${i}-args`} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td colSpan={narrow ? 8 : 9} className="p-2" style={{ backgroundColor: "var(--bg-raised)" }}>
                      <ArgsEditorDialog
                        value={rows[i].args}
                        onSave={(v) => {
                          updateRow(i, { args: v });
                          setArgsRow(null);
                        }}
                        onClose={() => setArgsRow(null)}
                      />
                    </td>
                  </tr>
                ) : null;
              // bundle：每个编号占一行，共享的单元格用 rowSpan 跨到相同行数
              if (r.kind === "bundle") {
                const n = r.ids.length;
                return [
                  ...r.ids.map((id, j) => (
                  <tr key={`${i}-${j}`} style={{ borderBottom: "1px solid var(--border)" }}>
                    {j === 0 && (
                      <td rowSpan={n} className="p-1 text-center">
                        <Checkbox checked={selected.has(i)} onChange={() => toggle(i)} />
                      </td>
                    )}
                    <td className="p-1 text-center" style={{ color: "var(--text-muted)" }}>
                      {id}
                    </td>
                    {j === 0 && (
                      <td rowSpan={n} className="p-1">
                        <Input type="number" className="h-6 px-1.5 text-xs" value={r.score}
                          onChange={(e) => updateRow(i, { score: Number(e.target.value) })} />
                      </td>
                    )}
                    {j === 0 && (
                      <td rowSpan={n} className="p-1">
                        <Select
                          value={String(r.subtask)}
                          options={subtaskOptions(r.subtask)}
                          onChange={(v) => updateRow(i, { subtask: Number(v) })}
                        />
                      </td>
                    )}
                    {j === 0 && (
                      <td rowSpan={n} className="p-1">
                        <span className="block text-center" style={{ color: "var(--text-muted)" }}>—</span>
                      </td>
                    )}
                    {j === 0 && (
                      <td rowSpan={n} className="p-1">
                        <span className="block text-center" style={{ color: "var(--text-muted)" }}>—</span>
                      </td>
                    )}
                    {j === 0 && (
                      <td rowSpan={n} className="p-1">
                        <Select
                          value={r.dmk}
                          options={DMK_OPTS}
                          onChange={(v) => updateRow(i, { dmk: v })}
                        />
                      </td>
                    )}
                    {j === 0 && (
                      <td rowSpan={n} className="p-1 text-center">
                        <Button
                          variant="ghost"
                          className="h-6 min-w-0 px-1.5 text-xs font-normal text-muted-foreground"
                          onClick={() => setArgsRow(argsRow === i ? null : i)}
                          title="编辑参数"
                        >
                          <Pencil size={12} className="mr-1" />
                          {Object.keys(r.args).length > 0 ? `${Object.keys(r.args).length} 项` : "编辑"}
                        </Button>
                      </td>
                    )}
                    {j === 0 && !narrow && (
                      <td rowSpan={n} className="p-1 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveRow(i, -1)} disabled={i === 0} title="上移">
                            <ArrowUp size={13} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveRow(i, 1)} disabled={i === rows.length - 1} title="下移">
                            <ArrowDown size={13} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => splitRow(i)} title="拆分为单个测试点">
                            <Split size={13} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteRow(i)} title="删除该行">
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    )}
                    </tr>
                  )),
                  panel,
                ];
              }
              return [
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="p-1 text-center">
                    <Checkbox checked={selected.has(i)} onChange={() => toggle(i)} />
                  </td>
                  <td className="p-1 text-center" style={{ color: "var(--text)" }}>
                    {r.id}
                  </td>
                  <td className="p-1">
                    <Input type="number" className="h-6 px-1.5 text-xs" value={r.score}
                      onChange={(e) => updateRow(i, { score: Number(e.target.value) })} />
                  </td>
                  <td className="p-1">
                    <Select
                      value={String(r.subtask)}
                      options={subtaskOptions(r.subtask)}
                      onChange={(v) => updateRow(i, { subtask: Number(v) })}
                    />
                  </td>
                  <td className="p-1">
                    <Input type="text" className="h-6 px-1.5 text-center text-xs" value={r.input}
                      onChange={(e) => updateRow(i, { input: e.target.value })} />
                  </td>
                  <td className="p-1">
                    <Input type="text" className="h-6 px-1.5 text-center text-xs" value={r.output}
                      onChange={(e) => updateRow(i, { output: e.target.value })} />
                  </td>
                  <td className="p-1">
                    <Select
                      value={r.dmk}
                      options={DMK_OPTS}
                      onChange={(v) => updateRow(i, { dmk: v })}
                    />
                  </td>
                  <td className="p-1 text-center">
                    <Button
                      variant="ghost"
                      className="h-6 min-w-0 px-1.5 text-xs font-normal text-muted-foreground"
                      onClick={() => setArgsRow(argsRow === i ? null : i)}
                      title="编辑参数"
                    >
                      <Pencil size={12} className="mr-1" />
                      {Object.keys(r.args).length > 0 ? `${Object.keys(r.args).length} 项` : "编辑"}
                    </Button>
                  </td>
                  {!narrow && (
                    <td className="p-1 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveRow(i, -1)} disabled={i === 0} title="上移">
                          <ArrowUp size={13} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveRow(i, 1)} disabled={i === rows.length - 1} title="下移">
                          <ArrowDown size={13} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteRow(i)} title="删除该行">
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>,
                panel,
              ];
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={narrow ? 8 : 9} className="p-3 text-center" style={{ color: "var(--text-muted)" }}>
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
