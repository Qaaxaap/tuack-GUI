// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import ConfigEditor from "./ConfigEditor";
import type { NodeKind, Project } from "../ipc/types";

interface Props {
  project: Project | null;
  selected: { dir: string; kind: NodeKind } | null;
}

export default function MainPanel({ project, selected }: Props) {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {selected ? (
        <ConfigEditor path={`${selected.dir}/conf.json`} kind={selected.kind} />
      ) : (
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
      )}
    </main>
  );
}
