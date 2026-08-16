// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { listDir } from "../ipc";
import PdfCanvas from "./PdfViewer";

interface Props {
  /** 节点目录（题目 / 场次） */
  dir: string;
  /** 已解析的 ren 模板名，优先探测 statements/<template>/ */
  template: string;
  /** ren 成功后自增，触发重新探测 */
  refreshKey: number;
  running: boolean;
  onRender: () => void;
  /** 分屏模式下带左边框 */
  bordered?: boolean;
}

async function findPdf(dir: string): Promise<string | null> {
  return listDir(dir)
    .then((res) => res.entries.find((e) => !e.is_dir && e.name.endsWith(".pdf"))?.path ?? null)
    .catch(() => null);
}

/** 兜底：statements/ 下任意模板子目录里第一个 PDF */
async function findPdfAny(parent: string): Promise<string | null> {
  const res = await listDir(parent).catch(() => null);
  if (!res) return null;
  for (const sub of res.entries) {
    if (!sub.is_dir) continue;
    const hit = await findPdf(sub.path);
    if (hit) return hit;
  }
  return null;
}

export default function PreviewPane({ dir, template, refreshKey, running, onRender, bordered }: Props) {
  const [pdf, setPdf] = useState<string | null>(null);
  const [probing, setProbing] = useState(true);

  useEffect(() => {
    let alive = true;
    setProbing(true);
    (async () => {
      let hit = await findPdf(`${dir}/statements/${template}`);
      if (!hit && alive) hit = await findPdfAny(`${dir}/statements`);
      if (!alive) return;
      setPdf(hit);
      setProbing(false);
    })();
    return () => {
      alive = false;
    };
  }, [dir, template, refreshKey]);

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      style={bordered ? { borderLeft: "1px solid var(--border)" } : undefined}
    >
      <div
        className="flex h-9 shrink-0 items-center justify-between gap-2 px-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
          {pdf ? pdf.split(/[\\/]/).pop() : "预览"}
        </span>
        {pdf && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-2 text-xs"
            onClick={onRender}
            disabled={running}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            重新渲染
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {pdf ? (
          <PdfCanvas path={pdf} />
        ) : probing ? (
          <div className="flex h-full items-center justify-center p-4 text-xs" style={{ color: "var(--text-muted)" }}>
            查找渲染结果…
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
            <FileText size={28} style={{ color: "var(--text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              还没有渲染结果，运行 ren 后在这里预览
            </p>
            <Button variant="default" onClick={onRender} disabled={running}>
              渲染
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
