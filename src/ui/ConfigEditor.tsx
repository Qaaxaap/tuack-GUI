// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";

import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { readConfig, writeConfig } from "../ipc";
import type { NodeKind } from "../ipc/types";
import Select from "./Select";
import Checkbox from "./Checkbox";
import TestDataEditor from "./TestDataEditor";
import Scoreboard from "./Scoreboard";

type FieldType = "text" | "number" | "bool" | "enum" | "json";

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
}

const FIELDS: Record<NodeKind, FieldDef[]> = {
  contest: [
    { key: "name", label: "名称", type: "text" },
    { key: "title", label: "标题", type: "text" },
    { key: "short title", label: "副标题", type: "text" },
    { key: "use_pretest", label: "使用预测试", type: "bool" },
    { key: "noi_style", label: "NOI 风格", type: "bool" },
    { key: "file_io", label: "文件 IO", type: "bool" },
  ],
  day: [
    { key: "name", label: "名称", type: "text" },
    { key: "title", label: "标题", type: "text" },
    { key: "start time", label: "开始时间 [年,月,日,时,分,秒]", type: "json" },
    { key: "end time", label: "结束时间 [年,月,日,时,分,秒]", type: "json" },
    { key: "use_pretest", label: "使用预测试", type: "bool" },
    { key: "noi_style", label: "NOI 风格", type: "bool" },
    { key: "file_io", label: "文件 IO", type: "bool" },
  ],
  problem: [
    { key: "name", label: "名称", type: "text" },
    { key: "title", label: "标题", type: "text" },
    { key: "type", label: "类型", type: "enum", options: ["program", "output", "interactive"] },
    { key: "time limit", label: "时间限制（秒）", type: "number" },
    { key: "memory limit", label: "内存限制", type: "text" },
    { key: "dmk", label: "数据生成", type: "enum", options: ["skip", "input", "output", "on"] },
  ],
};

function toDisplay(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

interface Props {
  path: string;
  dir: string;
  kind: NodeKind;
}

export default function ConfigEditor({ path, dir, kind }: Props) {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<"form" | "json" | "data" | "score">("form");
  const [jsonText, setJsonText] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setStatus("");
    readConfig(path)
      .then((c) => {
        setConfig(c);
        setJsonText(JSON.stringify(c, null, 2));
      })
      .catch((e) => setStatus(String(e)));
  }, [path]);

  function setField(key: string, value: unknown) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function saveForm() {
    if (!config) return;
    try {
      await writeConfig(path, config);
      setStatus("已保存");
    } catch (e) {
      setStatus(String(e));
    }
  }

  async function saveJson() {
    try {
      const parsed = JSON.parse(jsonText);
      await writeConfig(path, parsed);
      setStatus("已保存");
    } catch (e) {
      setStatus("JSON 无效：" + String(e));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4 py-2"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>
          {kind}
        </span>
        <button
          onClick={() => setTab("form")}
          className="px-2 py-0.5 text-xs"
          style={{
            color: tab === "form" ? "var(--text)" : "var(--text-muted)",
            borderBottom: tab === "form" ? "1px solid var(--brand)" : "1px solid transparent",
          }}
        >
          表单
        </button>
        {kind === "problem" && (
          <button
            onClick={() => setTab("data")}
            className="px-2 py-0.5 text-xs"
            style={{
              color: tab === "data" ? "var(--text)" : "var(--text-muted)",
              borderBottom: tab === "data" ? "1px solid var(--brand)" : "1px solid transparent",
            }}
          >
            测试点
          </button>
        )}
        {kind === "problem" && (
          <button
            onClick={() => setTab("score")}
            className="px-2 py-0.5 text-xs"
            style={{
              color: tab === "score" ? "var(--text)" : "var(--text-muted)",
              borderBottom: tab === "score" ? "1px solid var(--brand)" : "1px solid transparent",
            }}
          >
            评测结果
          </button>
        )}
        <button
          onClick={() => {
            if (config) setJsonText(JSON.stringify(config, null, 2));
            setTab("json");
          }}
          className="px-2 py-0.5 text-xs"
          style={{
            color: tab === "json" ? "var(--text)" : "var(--text-muted)",
            borderBottom: tab === "json" ? "1px solid var(--brand)" : "1px solid transparent",
          }}
        >
          高级 JSON
        </button>
        <span
          className="ml-auto text-xs"
          style={{
            color: status.startsWith("已保存")
              ? "var(--success)"
              : status
                ? "var(--danger)"
                : "var(--text-muted)",
          }}
        >
          {status}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {tab === "form" ? (
          config ? (
            <div className="flex max-w-md flex-col gap-3">
              {FIELDS[kind].map((f) => {
                const raw = config[f.key];
                if (f.type === "bool") {
                  return (
                    <Checkbox
                      key={f.key}
                      checked={!!raw}
                      onChange={(v) => setField(f.key, v)}
                      label={f.label}
                    />
                  );
                }
                return (
                  <div key={f.key} className="flex flex-col gap-1">
                    <label className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {f.label}
                    </label>
                    {f.type === "enum" ? (
                      <Select
                        value={String(raw ?? "")}
                        options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
                        onChange={(v) => setField(f.key, v)}
                      />
                    ) : f.type === "number" ? (
                      <input
                        type="number"
                        step="any"
                        value={raw === null || raw === undefined ? "" : Number(raw)}
                        onChange={(e) =>
                          setField(f.key, e.target.value === "" ? null : Number(e.target.value))
                        }
                        className="w-full rounded px-2 py-1.5 text-sm"
                        style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                      />
                    ) : f.type === "json" ? (
                      <input
                        type="text"
                        value={toDisplay(raw)}
                        onChange={(e) => {
                          const t = e.target.value;
                          try {
                            setField(f.key, JSON.parse(t));
                          } catch {
                            setField(f.key, t);
                          }
                        }}
                        className="w-full rounded px-2 py-1.5 text-sm"
                        style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={raw === null || raw === undefined ? "" : String(raw)}
                        onChange={(e) => setField(f.key, e.target.value)}
                        className="w-full rounded px-2 py-1.5 text-sm"
                        style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                      />
                    )}
                  </div>
                );
              })}
              <Button variant="default" className="self-start" onClick={saveForm}>
                保存
              </Button>
            </div>
          ) : (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              加载中…
            </div>
          )
        ) : tab === "data" ? (
          <TestDataEditor value={config?.["data"]} onChange={(v) => setField("data", v)} />
        ) : tab === "score" ? (
          <Scoreboard dir={dir} />
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-2">
            <div className="min-h-0 flex-1 overflow-hidden rounded" style={{ border: "1px solid var(--border)" }}>
              <CodeMirror
                value={jsonText}
                onChange={setJsonText}
                extensions={[json()]}
                theme="dark"
                height="100%"
                style={{ fontSize: 12, height: "100%" }}
              />
            </div>
            <Button variant="default" className="self-start" onClick={saveJson}>
              保存
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
