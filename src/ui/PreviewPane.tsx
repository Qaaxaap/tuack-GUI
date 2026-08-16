// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useRef, useState } from "react";
import { FileText, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";
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

const ZOOM_MIN = 0.5;
/** 上限 = 适应宽度（100%）：页面永不超过预览列宽，不出现横向裁剪 */
const ZOOM_MAX = 1;
const clampZoom = (v: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v));

export default function PreviewPane({ dir, template, refreshKey, running, onRender, bordered }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<string | null>(null);
  const [probing, setProbing] = useState(true);
  /** 相对「适应宽度」的缩放倍率，1 = 适应宽度 */
  const [zoom, setZoom] = useState(1);

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

  // 切换节点回到「适应宽度」
  useEffect(() => setZoom(1), [dir]);

  // Ctrl/Cmd + 滚轮缩放。必须原生监听且 passive:false，
  // React 的 onWheel 挂在 passive 监听器上，preventDefault 无效
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomLabel = zoom === 1 ? "适应宽度" : `${Math.round(zoom * 100)}%`;

  return (
    <div
      ref={rootRef}
      className="flex h-full min-h-0 flex-col"
      style={bordered ? { borderLeft: "1px solid var(--border)" } : undefined}
    >
      <div
        className="flex h-9 shrink-0 items-center gap-1 px-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="min-w-0 flex-1 truncate text-xs" style={{ color: "var(--text-muted)" }}>
          {pdf ? pdf.split(/[\\/]/).pop() : "预览"}
        </span>
        {pdf && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="缩小"
              onClick={() => setZoom((z) => clampZoom(z / 1.1))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              title="适应宽度"
              onClick={() => setZoom(1)}
            >
              {zoomLabel}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="放大"
              onClick={() => setZoom((z) => clampZoom(z * 1.1))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
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
          </>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {pdf ? (
          <PdfCanvas path={pdf} zoom={zoom} />
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
