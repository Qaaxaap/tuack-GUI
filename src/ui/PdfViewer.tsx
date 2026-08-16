// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useRef, useState } from "react";
// legacy 构建自带 Map.prototype.getOrInsertComputed 等新 API 的 polyfill，
// 兼容旧版 WebView2（如精简版系统自带的、无法自动更新的运行时）
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileBase64 } from "../ipc";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface Props {
  path: string;
  /** 固定缩放倍率（如 1.5 = 150%）；null = 适应容器宽度（默认） */
  scale?: number | null;
}

/** 内嵌 PDF 渲染器：整本渲染，页宽自适应容器宽度或按固定倍率（无弹窗） */
export default function PdfCanvas({ path, scale = null }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [dpr, setDpr] = useState(() => window.devicePixelRatio || 1);
  const [error, setError] = useState("");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0]?.contentRect.width ?? 0));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 窗口跨屏移动 / 系统缩放变化时 dpr 会变，跟随重渲染
  useEffect(() => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onChange = () => setDpr(window.devicePixelRatio || 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (width <= 0) return;
    let cancelled = false;
    setError("");
    (async () => {
      try {
        const b64 = await readFileBase64(path);
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        const container = containerRef.current;
        if (!container) return;
        // 先在离屏容器里渲染完整本，完成后再一次性替换，
        // 避免 resize / 重渲染时整页闪白
        const holder = document.createElement("div");
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          // 固定倍率优先；否则页宽贴合容器（最小 0.5 倍防退化）。
          // 乘 dpr 按物理像素渲染，高分屏（125%/150% 缩放）下文字不糊
          const fit = Math.max(0.5, width / base.width);
          const pageScale = (scale ?? fit) * dpr;
          const viewport = page.getViewport({ scale: pageScale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          // 显示尺寸仍为 CSS 像素，显式给定避免分数拉伸
          canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
          canvas.style.height = "auto";
          canvas.style.marginBottom = "8px";
          await page.render({ canvas, viewport }).promise;
          if (cancelled) return;
          holder.appendChild(canvas);
        }
        if (!cancelled) container.replaceChildren(holder);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, width, dpr, scale]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {error && (
        <div className="shrink-0 p-3 text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}
      {/* overflow-y: scroll 常驻滚动条槽：内容区宽度不随滚动条出现/消失变化，
          否则会形成「滚动条出现 → 变窄 → 重渲染 → 滚动条消失 → 变宽」的死循环闪烁 */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-y-scroll"
        style={{ backgroundColor: "var(--bg)", scrollbarGutter: "stable" }}
      />
    </div>
  );
}
