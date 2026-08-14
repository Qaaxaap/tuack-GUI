// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type BackendState = "connecting" | "ok" | "error";

export default function MainPanel() {
  const [backend, setBackend] = useState<BackendState>("connecting");
  const [error, setError] = useState("");

  useEffect(() => {
    invoke<string>("ping")
      .then((pong) => setBackend(pong === "pong" ? "ok" : "error"))
      .catch((e) => {
        setBackend("error");
        setError(String(e));
      });
  }, []);

  const badge =
    backend === "connecting"
      ? { color: "var(--vscode-text-muted)", text: "连接后端中…" }
      : backend === "ok"
        ? { color: "#4ec9b0", text: "后端已连接（IPC 正常）" }
        : { color: "#f14c4c", text: `后端连接失败：${error}` };

  return (
    <main
      className="flex flex-1 flex-col items-center justify-center gap-3"
      style={{ backgroundColor: "var(--vscode-editor-bg)" }}
    >
      <h1 className="text-2xl font-semibold" style={{ color: "var(--vscode-text)" }}>
        Tuack-GUI
      </h1>
      <p style={{ color: "var(--vscode-text-muted)" }}>
        美观、跨平台的 Tuack-NG 图形化前端
      </p>
      <span className="text-xs" style={{ color: badge.color }}>
        {badge.text}
      </span>
    </main>
  );
}
