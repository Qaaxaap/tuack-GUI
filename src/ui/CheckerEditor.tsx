// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import Select from "./Select";

/**
 * checker / validator 配置编辑器（ProblemConfig 的
 * Option<CheckerConfigPair> / Option<ValidatorConfigPair>）。
 * 值为 null 表示未设置；结构 { data: {source, deps}, sample: ...|null }。
 */

interface CheckerPart {
  source: string;
  deps: string[];
}

interface Pair {
  data: CheckerPart;
  sample: CheckerPart | null;
}

function parsePart(v: unknown): CheckerPart | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.source !== "string") return null;
  return {
    source: o.source,
    deps: Array.isArray(o.deps) ? o.deps.map(String) : [],
  };
}

function parse(v: unknown): Pair | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const data = parsePart(o.data);
  if (!data) return null;
  return { data, sample: parsePart(o.sample) };
}

function serialize(p: Pair): unknown {
  return {
    data: { source: p.data.source, deps: p.data.deps },
    sample: p.sample ? { source: p.sample.source, deps: p.sample.deps } : null,
  };
}

const EMPTY: Pair = { data: { source: "", deps: [] }, sample: null };

interface Props {
  title: string;
  value: unknown;
  onChange: (v: unknown) => void;
}

export default function CheckerEditor({ title, value, onChange }: Props) {
  const pair = parse(value);
  const enabled = pair !== null;
  const p = pair ?? EMPTY;

  function updateData(patch: Partial<CheckerPart>) {
    if (!pair) return;
    onChange(serialize({ ...pair, data: { ...pair.data, ...patch } }));
  }

  function updateSample(next: CheckerPart | null) {
    if (!pair) return;
    onChange(serialize({ ...pair, sample: next }));
  }

  return (
    <div className="flex flex-col gap-2 rounded border p-3" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <div className="w-32">
          <Select
            value={enabled ? "custom" : "none"}
            options={[
              { value: "none", label: "未设置" },
              { value: "custom", label: "自定义" },
            ]}
            onChange={(v) => onChange(v === "custom" ? serialize(EMPTY) : null)}
          />
        </div>
      </div>

      {enabled && (
        <>
          <div className="flex flex-col gap-1">
            <Label>正式数据 · 源文件（相对题目目录）</Label>
            <Input
              value={p.data.source}
              onChange={(e) => updateData({ source: e.target.value })}
              placeholder="如 checker.cpp"
            />
            <Label className="mt-1">正式数据 · 依赖（空格或逗号分隔）</Label>
            <Input
              value={p.data.deps.join(" ")}
              onChange={(e) =>
                updateData({ deps: e.target.value.split(/[\s,]+/).filter(Boolean) })
              }
              placeholder="如 testlib.h utils.cpp"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label>样例数据</Label>
            <div className="w-32">
              <Select
                value={p.sample ? "custom" : "follow"}
                options={[
                  { value: "follow", label: "跟随正式" },
                  { value: "custom", label: "自定义" },
                ]}
                onChange={(v) => updateSample(v === "custom" ? { source: "", deps: [] } : null)}
              />
            </div>
          </div>

          {p.sample && (
            <div className="flex flex-col gap-1">
              <Label>样例 · 源文件（相对题目目录）</Label>
              <Input
                value={p.sample.source}
                onChange={(e) => updateSample({ ...p.sample!, source: e.target.value })}
                placeholder="如 checker_sample.cpp"
              />
              <Label className="mt-1">样例 · 依赖（空格或逗号分隔）</Label>
              <Input
                value={p.sample.deps.join(" ")}
                onChange={(e) =>
                  updateSample({ ...p.sample!, deps: e.target.value.split(/[\s,]+/).filter(Boolean) })
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
