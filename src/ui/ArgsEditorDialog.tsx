// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Select from "./Select";

/**
 * 测试点 args 的结构化编辑器：args 是 untagged 标量联合
 * { 键: 整数 | 小数 | 字符串 | 布尔 }，这里以键值行编辑。
 * 内联面板（在所属测试点行下方展开），不再使用弹窗。
 */

type ArgType = "int" | "float" | "str" | "bool";

interface Entry {
  key: string;
  type: ArgType;
  raw: string; // 数值/字符串的文本；bool 时为 "true"/"false"
}

const TYPE_OPTS = [
  { value: "int", label: "整数" },
  { value: "float", label: "小数" },
  { value: "str", label: "字符串" },
  { value: "bool", label: "布尔" },
];

const BOOL_OPTS = [
  { value: "true", label: "真" },
  { value: "false", label: "假" },
];

function toEntries(value: Record<string, unknown>): Entry[] {
  return Object.entries(value).map(([k, v]) => {
    if (typeof v === "boolean") return { key: k, type: "bool", raw: String(v) };
    if (typeof v === "number") {
      return Number.isInteger(v) ? { key: k, type: "int", raw: String(v) } : { key: k, type: "float", raw: String(v) };
    }
    return { key: k, type: "str", raw: String(v ?? "") };
  });
}

interface Props {
  value: Record<string, unknown>;
  onSave: (v: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function ArgsEditorDialog({ value, onSave, onClose }: Props) {
  const [entries, setEntries] = useState<Entry[]>(toEntries(value));
  const [error, setError] = useState("");

  function setEntry(i: number, patch: Partial<Entry>) {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  function add() {
    setEntries((prev) => [...prev, { key: "", type: "int", raw: "" }]);
  }

  function remove(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  function save() {
    const out: Record<string, unknown> = {};
    for (const e of entries) {
      const key = e.key.trim();
      if (!key) {
        setError("存在空的键名");
        return;
      }
      if (key in out) {
        setError(`键名重复：${key}`);
        return;
      }
      if (e.type === "int") {
        const n = Number(e.raw);
        if (!Number.isInteger(n)) {
          setError(`「${key}」不是合法整数`);
          return;
        }
        out[key] = n;
      } else if (e.type === "float") {
        const n = Number(e.raw);
        if (!Number.isFinite(n)) {
          setError(`「${key}」不是合法小数`);
          return;
        }
        out[key] = n;
      } else if (e.type === "bool") {
        out[key] = e.raw === "true";
      } else {
        out[key] = e.raw;
      }
    }
    onSave(out);
  }

  return (
    <div className="rounded border p-3" style={{ borderColor: "var(--border)" }}>
      <div className="mb-2 text-xs font-medium" style={{ color: "var(--foreground)" }}>
        测试点参数（args）
      </div>

      <div className="flex max-h-[40vh] flex-col gap-2 overflow-auto">
        {entries.map((e, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={e.key}
              onChange={(ev) => setEntry(i, { key: ev.target.value })}
              placeholder="键名"
              className="h-7 w-28 shrink-0 text-xs"
            />
            <div className="w-24 shrink-0">
              <Select
                value={e.type}
                options={TYPE_OPTS}
                onChange={(v) => setEntry(i, { type: v as ArgType })}
              />
            </div>
            {e.type === "bool" ? (
              <div className="w-20 shrink-0">
                <Select
                  value={e.raw}
                  options={BOOL_OPTS}
                  onChange={(v) => setEntry(i, { raw: v })}
                />
              </div>
            ) : (
              <Input
                value={e.raw}
                onChange={(ev) => setEntry(i, { raw: ev.target.value })}
                placeholder={e.type === "str" ? "值" : e.type === "int" ? "整数" : "小数"}
                className="h-7 min-w-0 flex-1 text-xs"
              />
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => remove(i)} title="删除">
              <Trash2 size={13} />
            </Button>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="py-2 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
            无参数
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <Button variant="ghost" className="h-7 px-2 text-xs" onClick={add}>
          <Plus size={13} />
          添加
        </Button>
        {error ? (
          <span className="text-xs" style={{ color: "var(--destructive)" }}>
            {error}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" className="h-7 px-2 text-xs" onClick={onClose}>
          取消
        </Button>
        <Button variant="default" className="h-7 px-2 text-xs" onClick={save}>
          确定
        </Button>
      </div>
    </div>
  );
}
