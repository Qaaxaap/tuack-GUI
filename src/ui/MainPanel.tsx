// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Project } from "../ipc/types";

export default function MainPanel({ project }: { project: Project | null }) {
  const [pingOk, setPingOk] = useState(false);

  useEffect(() => {
    invoke<string>("ping")
      .then((p) => setPingOk(p === "pong"))
      .catch(() => setPingOk(false));
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      {project ? (
        <>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            {project.contest.title || project.contest.name}
          </h1>
          <p className="text-xs break-all" style={{ color: "var(--text-muted)" }}>{project.root}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>配置表单将在 M3 实现</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>Tuack-GUI</h1>
          <p style={{ color: "var(--text-muted)" }}>美观、跨平台的 Tuack-NG 图形化前端</p>
        </>
      )}
      <span
        className="rounded-full px-3 py-1 text-xs"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          color: pingOk ? "var(--success)" : "var(--danger)",
        }}
      >
        {pingOk ? "后端已连接" : "后端未连接"}
      </span>
    </main>
  );
}
