// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";

import { useEffect, useState } from "react";
import Select from "./Select";
import type { Command, DataTarget, DmkAction, DumpTarget } from "../ipc/types";

type FieldKind = "text" | "select";

interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
}

interface CommandSpec {
  id: string;
  label: string;
  fields: FieldSpec[];
  build: (v: Record<string, string>) => Command;
}

function splitNames(s: string): string[] {
  return s.trim() ? s.trim().split(/\s+/) : [];
}

const COMMANDS: CommandSpec[] = [
  {
    id: "gen-contest", label: "生成比赛（gen contest）",
    fields: [{ key: "names", label: "比赛名", kind: "text", placeholder: "如 noip2026" }],
    build: (v) => ({ command: "gen", target: "contest", names: splitNames(v.names), confirm: false }),
  },
  {
    id: "gen-day", label: "生成场次（gen day）",
    fields: [{ key: "names", label: "场次名", kind: "text", placeholder: "如 day1 day2（可多个）" }],
    build: (v) => ({ command: "gen", target: "day", names: splitNames(v.names), confirm: false }),
  },
  {
    id: "gen-problem", label: "生成题目（gen problem）",
    fields: [{ key: "names", label: "题目名", kind: "text", placeholder: "如 prob1 prob2（可多个）" }],
    build: (v) => ({ command: "gen", target: "problem", names: splitNames(v.names), confirm: false }),
  },
  { id: "gen-data", label: "生成数据（gen data）", fields: [], build: () => ({ command: "gen", target: "data", names: [], confirm: true }) },
  { id: "gen-samples", label: "生成样例（gen samples）", fields: [], build: () => ({ command: "gen", target: "samples", names: [], confirm: true }) },
  { id: "gen-all", label: "生成全部（gen all）", fields: [], build: () => ({ command: "gen", target: "all", names: [], confirm: true }) },
  { id: "test-data", label: "测试正式数据（test data）", fields: [], build: () => ({ command: "test", target: "data" }) },
  { id: "test-sample", label: "测试样例（test sample）", fields: [], build: () => ({ command: "test", target: "sample" }) },
  {
    id: "ren", label: "渲染题面（ren）",
    fields: [
      { key: "template", label: "模板名", kind: "text", placeholder: "如 noi / ccpc" },
      { key: "keep_tmp", label: "保留临时目录", kind: "select", options: ["否", "是"] },
      { key: "no_auto_open", label: "不自动打开", kind: "select", options: ["否", "是"], defaultValue: "是" },
    ],
    build: (v) => ({ command: "ren", template: v.template, keep_tmp: v.keep_tmp === "是", no_auto_open: v.no_auto_open === "是" }),
  },
  {
    id: "dmk", label: "生成数据（dmk）",
    fields: [
      { key: "target", label: "目标", kind: "select", options: ["data", "sample"] },
      { key: "action", label: "操作", kind: "select", options: ["gen", "regen", "reset"] },
      { key: "object", label: "对象", kind: "text", placeholder: "all（或 1,2-3）", defaultValue: "all" },
      { key: "validate", label: "生成后校验", kind: "select", options: ["默认", "是", "否"], defaultValue: "默认" },
    ],
    build: (v) => ({
      command: "dmk",
      target: v.target as DataTarget,
      action: v.action as DmkAction,
      object: v.object || "all",
      validate: v.validate === "默认" ? null : v.validate === "是",
    }),
  },
  {
    id: "validate", label: "校验输入（validate）",
    fields: [
      { key: "target", label: "目标", kind: "select", options: ["data", "sample"] },
      { key: "object", label: "对象", kind: "text", placeholder: "all（或 1,2-3）", defaultValue: "all" },
    ],
    build: (v) => ({ command: "validate", target: v.target as DataTarget, object: v.object || "all" }),
  },
  {
    id: "dump", label: "导出（dump）",
    fields: [{ key: "target", label: "目标", kind: "select", options: ["lemon", "arbiter"] }],
    build: (v) => ({ command: "dump", target: v.target as DumpTarget }),
  },
  {
    id: "doc-format", label: "文档格式化（doc format）",
    fields: [{ key: "explain", label: "解释规则（可选）", kind: "text", placeholder: "留空 = 全部" }],
    build: (v) => ({ command: "doc-format", explain: v.explain.trim() || null }),
  },
  {
    id: "doc-check", label: "文档检查（doc check）",
    fields: [{ key: "explain", label: "解释规则（可选）", kind: "text", placeholder: "留空 = 全部" }],
    build: (v) => ({ command: "doc-check", explain: v.explain.trim() || null }),
  },
  { id: "doc-validate", label: "文档校验（doc validate）", fields: [], build: () => ({ command: "doc-validate" }) },
  {
    id: "conf-title", label: "批量设置标题（conf title）",
    fields: [{ key: "values", label: "标题（按顺序，空格分隔）", kind: "text", placeholder: "标题1 标题2" }],
    build: (v) => ({ command: "conf-title", values: splitNames(v.values) }),
  },
  {
    id: "conf-time", label: "批量设置时限（conf time）",
    fields: [{ key: "values", label: "时限（按顺序，空格分隔）", kind: "text", placeholder: "1.0 2.0" }],
    build: (v) => ({ command: "conf-time", values: splitNames(v.values) }),
  },
  {
    id: "conf-length", label: "批量设置时长（conf length）",
    fields: [{ key: "values", label: "时长（按顺序，空格分隔）", kind: "text", placeholder: "4.0 4.5" }],
    build: (v) => ({ command: "conf-length", values: splitNames(v.values) }),
  },
  { id: "conf-migrate", label: "迁移配置（conf migrate）", fields: [], build: () => ({ command: "conf-migrate" }) },
];

interface Props {
  defaultCwd: string;
  onRun: (cmd: Command, cwd: string) => void;
  onClose: () => void;
}

export default function CommandPanel({ defaultCwd, onRun, onClose }: Props) {
  const [cmdId, setCmdId] = useState(COMMANDS[0].id);
  const [cwd, setCwd] = useState(defaultCwd);
  const [values, setValues] = useState<Record<string, string>>({});

  const spec = COMMANDS.find((c) => c.id === cmdId)!;

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const f of spec.fields) {
      next[f.key] = f.defaultValue ?? (f.kind === "select" ? (f.options?.[0] ?? "") : "");
    }
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmdId]);

  function setVal(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function submit() {
    onRun(spec.build(values), cwd.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
      <div className="w-96 rounded-lg p-4" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border)" }}>
        <div className="mb-3 text-sm" style={{ color: "var(--text)" }}>运行命令</div>

        <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>命令</label>
        <Select
          value={cmdId}
          options={COMMANDS.map((c) => ({ value: c.id, label: c.label }))}
          onChange={setCmdId}
        />

        {spec.fields.map((f) => (
          <div key={f.key} className="mb-2">
            <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>{f.label}</label>
            {f.kind === "select" ? (
              <Select
                value={values[f.key] ?? f.options?.[0] ?? ""}
                options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
                onChange={(v) => setVal(f.key, v)}
              />
            ) : (
              <input
                type="text"
                value={values[f.key] ?? ""}
                onChange={(e) => setVal(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full rounded px-2 py-1.5 text-sm"
                style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            )}
          </div>
        ))}

        <label className="mb-1 block text-xs" style={{ color: "var(--text-muted)" }}>工作目录（cwd）</label>
        <input
          value={cwd}
          onChange={(e) => setCwd(e.currentTarget.value)}
          className="mb-3 w-full rounded px-2 py-1.5 text-sm"
          style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="default" onClick={submit}>运行</Button>
        </div>
      </div>
    </div>
  );
}
