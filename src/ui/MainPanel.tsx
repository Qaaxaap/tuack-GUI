// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useRef, useState } from "react";
import ConfigEditor from "./ConfigEditor";
import PreviewPane from "./PreviewPane";
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
}

/** 低于该宽度时配置 / 预览退化为切换 tab（类比 Qt resizeEvent 动态换布局） */
const SPLIT_WIDTH = 880;

export default function MainPanel({
  project,
  selected,
  theme,
  running,
  template,
  refreshKey,
  onRender,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [view, setView] = useState<"config" | "preview">("config");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setNarrow((entries[0]?.contentRect.width ?? 0) < SPLIT_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  return (
    <main ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      {!selected ? (
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
      ) : showPreview && narrow ? (
        <>
          <div
            className="flex shrink-0 items-center gap-1 px-3 py-2"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            {(["config", "preview"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="rounded px-3 py-1 text-xs"
                style={
                  view === v
                    ? { backgroundColor: "var(--brand)", color: "#fff" }
                    : { color: "var(--text-muted)" }
                }
              >
                {v === "config" ? "配置" : "预览"}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">{view === "config" ? config : preview}</div>
        </>
      ) : showPreview ? (
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 overflow-hidden" style={{ flex: "50 1 0%" }}>
            {config}
          </div>
          <div className="min-w-0 overflow-hidden" style={{ flex: "50 1 0%" }}>
            {preview}
          </div>
        </div>
      ) : (
        config
      )}
    </main>
  );
}
