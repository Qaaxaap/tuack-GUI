// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { readConfig, writeConfig, getRenDefaults, setRenProject } from "../ipc";
import { reportError } from "../errors";
import type { NodeKind } from "../ipc/types";
import type { AppTheme } from "../theme";
import { TEMPLATES } from "../templates";
import Select from "./Select";
import Checkbox from "./Checkbox";
import TestDataEditor from "./TestDataEditor";
import Scoreboard from "./Scoreboard";
import CheckerEditor from "./CheckerEditor";

type FieldType = "text" | "number" | "bool" | "enum" | "json";

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  /** 与 options 对齐的显示标签（本地化） */
  labels?: string[];
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
    { key: "type", label: "类型", type: "enum", options: ["program", "output", "interactive"], labels: ["传统题", "提交答案题", "交互题"] },
    { key: "time limit", label: "时间限制（秒）", type: "number" },
    { key: "memory limit", label: "内存限制", type: "text" },
    { key: "dmk", label: "数据生成", type: "enum", options: ["skip", "input", "output", "on"], labels: ["忽略", "只生成输入", "只生成输出", "启用"] },
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
  theme: AppTheme;
  running: boolean;
  projectRoot: string;
}

export default function ConfigEditor({ path, dir, kind, theme, running, projectRoot }: Props) {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<"form" | "json" | "data" | "score" | "gui">("form");
  const [jsonText, setJsonText] = useState("");
  const [status, setStatus] = useState("");
  const [renProject, setRenProjectState] = useState("");

  useEffect(() => {
    setStatus("");
    readConfig(path)
      .then((c) => {
        setConfig(c);
        setJsonText(JSON.stringify(c, null, 2));
      })
      .catch((e) => setStatus(String(e)));
    if (kind === "contest") {
      // 项目级 GUI 配置（存于项目根 .tuack-gui.json）
      getRenDefaults(dir)
        .then((d) => setRenProjectState(d.project ?? ""))
        .catch((e) => reportError(`读取项目 ren 模板失败：${e}`));
    }
  }, [path, kind, dir]);

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

  function handleTab(v: string) {
    if (v === "json" && config) setJsonText(JSON.stringify(config, null, 2));
    setTab(v as "form" | "json" | "data" | "score");
  }

  return (
    <Tabs value={tab} onValueChange={handleTab} className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4 py-2"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>
          {kind}
        </span>
        <TabsList>
          <TabsTrigger value="form">表单</TabsTrigger>
          {kind === "problem" && <TabsTrigger value="data">测试点</TabsTrigger>}
          {kind === "problem" && <TabsTrigger value="score">评测结果</TabsTrigger>}
          <TabsTrigger value="json">高级 JSON</TabsTrigger>
          {kind === "contest" && <TabsTrigger value="gui">偏好</TabsTrigger>}
        </TabsList>
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
        <TabsContent value="form">
          {config ? (
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
                    <Label>{f.label}</Label>
                    {f.type === "enum" ? (
                      <Select
                        value={String(raw ?? "")}
                        options={(f.options ?? []).map((o, i) => ({
                          value: o,
                          label: f.labels?.[i] ?? o,
                        }))}
                        onChange={(v) => setField(f.key, v)}
                      />
                    ) : f.type === "number" ? (
                      <Input
                        type="number"
                        step="any"
                        value={raw === null || raw === undefined ? "" : Number(raw)}
                        onChange={(e) =>
                          setField(f.key, e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
                    ) : f.type === "json" ? (
                      <Input
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
                      />
                    ) : (
                      <Input
                        type="text"
                        value={raw === null || raw === undefined ? "" : String(raw)}
                        onChange={(e) => setField(f.key, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
              {kind === "problem" && (
                <>
                  <CheckerEditor
                    title="checker（校验器）"
                    value={config?.["checker"]}
                    onChange={(v) => setField("checker", v)}
                  />
                  <CheckerEditor
                    title="validator（数据校验器）"
                    value={config?.["validator"]}
                    onChange={(v) => setField("validator", v)}
                  />
                </>
              )}
              <Button variant="default" className="self-start" onClick={saveForm}>
                保存
              </Button>
            </div>
          ) : (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              加载中…
            </div>
          )}
        </TabsContent>
        <TabsContent value="data">
          <TestDataEditor
            value={config?.["data"]}
            onChange={(v) => setField("data", v)}
            subtasks={
              config?.["subtasks"] && typeof config["subtasks"] === "object"
                ? (config["subtasks"] as Record<string, string>)
                : undefined
            }
            onSubtasksChange={(v) => setField("subtasks", v)}
          />
        </TabsContent>
        <TabsContent value="score">
          <Scoreboard dir={dir} running={running} projectRoot={projectRoot} />
        </TabsContent>
        <TabsContent value="json">
          <div className="flex h-full min-h-0 flex-col gap-2">
            <div className="min-h-0 flex-1 overflow-hidden rounded" style={{ border: "1px solid var(--border)" }}>
              <CodeMirror
                value={jsonText}
                onChange={setJsonText}
                extensions={[json()]}
                theme={theme}
                height="100%"
                style={{ fontSize: 12, height: "100%" }}
              />
            </div>
            <Button variant="default" className="self-start" onClick={saveJson}>
              保存
            </Button>
          </div>
        </TabsContent>
        {kind === "contest" && (
          <TabsContent value="gui">
            <div className="flex max-w-md flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label>ren 默认模板（项目）</Label>
                <Select
                  value={renProject || "__unset__"}
                  options={[
                    { value: "__unset__", label: "未设置（跟随全局，默认 noi）" },
                    ...TEMPLATES.map((t) => ({ value: t, label: t })),
                  ]}
                  onChange={(v) => {
                    const t = v === "__unset__" ? "" : v;
                    setRenProjectState(t);
                    setRenProject(dir, t).catch((e) => reportError(`保存项目 ren 模板失败：${e}`));
                  }}
                />
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  存于项目根目录 .tuack-gui.json；运行命令面板中显式选择模板运行后也会自动写入。
                </span>
              </div>
            </div>
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
