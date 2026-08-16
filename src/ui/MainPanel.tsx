// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useRef, useState } from "react";
import ConfigEditor from "./ConfigEditor";
import PreviewPane from "./PreviewPane";
import StatementEditor from "./StatementEditor";
import type { NodeKind, Project } from "../ipc/types";
import type { AppTheme } from "../theme";

interface Props {
  project: Project | null;
  selected: { dir: string; kind: NodeKind } | null;
  theme: AppTheme;
  running: boolean;
  /** 已解析默认值的 ren 模板，预览据此探测 statements/<template>/ */
  template: string;
  /** ren 成功后自增，触发预览重新探测 */
  refreshKey: number;
  onRender: () => void;
  /** 保存题面后自动 ren（默认开） */
  autoRen: boolean;
  onAutoRenChange: (v: boolean) => void;
}

/** 低于该宽度时配置 / 编辑 / 预览退化为切换 tab（类比 Qt resizeEvent 动态换布局） */
const SPLIT_WIDTH = 880;

type MainView = "config" | "edit" | "preview";

export default function MainPanel({
  project,
  selected,
  theme,
  running,
  template,
  refreshKey,
  onRender,
  autoRen,
  onAutoRenChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [view, setView] = useState<MainView>("config");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setNarrow((entries[0]?.contentRect.width ?? 0) < SPLIT_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 变宽后「预览」不再作为左栏视图：预览常驻右栏
  useEffect(() => {
    if (!narrow && view === "preview") setView("config");
  }, [narrow, view]);

  const showPreview = selected != null && selected.kind !== "contest";

  const config = selected ? (
    <ConfigEditor
      path={`${selected.dir}/conf.json`}
      dir={selected.dir}
      kind={selected.kind}
      theme={theme}
      running={running}
      projectRoot={project?.root ?? ""}
    />
  ) : null;

  const editor = selected && selected.kind === "problem" ? (
    <StatementEditor
      dir={selected.dir}
      autoRen={autoRen}
      onAutoRenChange={onAutoRenChange}
      onRender={onRender}
      running={running}
      theme={theme}
    />
  ) : null;

  const preview = selected && showPreview ? (
    <PreviewPane
      dir={selected.dir}
      template={template}
      refreshKey={refreshKey}
      running={running}
      onRender={onRender}
      bordered={!narrow}
    />
  ) : null;

  if (!selected) {
    return (
      <main ref={containerRef} className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          {project ? (
            <>
              <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                {project.contest.title || project.contest.name}
              </h1>
              <p className="text-xs break-all" style={{ color: "var(--text-muted)" }}>
                {project.root}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                在左侧选择一个比赛 / 场次 / 题目以编辑其配置
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
                Tuack-GUI
              </h1>
              <p style={{ color: "var(--text-muted)" }}>美观、跨平台的 Tuack-NG 图形化前端</p>
            </>
          )}
        </div>
      </main>
    );
  }

  // 比赛根节点：只有配置，无编辑/预览
  if (!showPreview) {
    return (
      <main ref={containerRef} className="flex min-h-0 flex-1 flex-col">
        {config}
      </main>
    );
  }

  // 宽屏隐藏「预览」项（预览常驻右栏）；窄屏全显；
  // 场次节点无单一题面源，不出「编辑」项
  const isProblem = selected.kind === "problem";
  const views: { id: MainView; label: string }[] = [
    { id: "config", label: "配置" },
    ...(isProblem ? ([{ id: "edit", label: "编辑" }] as const) : []),
    ...(narrow ? ([{ id: "preview", label: "预览" }] as const) : []),
  ];

  const leftContent = view === "edit" ? editor : config;

  return (
    <main ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex shrink-0 items-center gap-1 px-3 py-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className="rounded px-3 py-1 text-xs"
            style={
              view === v.id
                ? { backgroundColor: "var(--brand)", color: "#fff" }
                : { color: "var(--text-muted)" }
            }
          >
            {v.label}
          </button>
        ))}
      </div>
      {narrow ? (
        <div className="min-h-0 flex-1">
          {view === "config" ? config : view === "edit" ? editor : preview}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* 列容器必须是 flex-col：ConfigEditor 根部的 flex-1 依赖 flex 父级
              才拿到确定高度，否则高度塌成内容高，内部滚动全部失效 */}
          <div className="flex min-w-0 flex-col overflow-hidden" style={{ flex: "50 1 0%" }}>
            {leftContent}
          </div>
          <div className="flex min-w-0 flex-col overflow-hidden" style={{ flex: "50 1 0%" }}>
            {preview}
          </div>
        </div>
      )}
    </main>
  );
}
