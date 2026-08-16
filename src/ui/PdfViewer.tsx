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

interface PageEntry {
  wrapper: HTMLDivElement;
  canvas: HTMLCanvasElement;
  /** 适应宽度下的 CSS 像素尺寸 */
  fitW: number;
  fitH: number;
}

interface Props {
  path: string;
  /** 相对「适应宽度」的缩放倍率（≤1）：1 = 适应宽度，0.5 = 缩小一半 */
  zoom?: number;
}

/** 内嵌 PDF 渲染器：按适应宽度整本渲染（物理像素级清晰），
    缩放 ≤1 通过 transform 即时完成，页面宽度永不超过容器 */
export default function PdfCanvas({ path, zoom = 1 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<PageEntry[]>([]);
  const renderSeq = useRef(0);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
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

  /** 按适应宽度渲染整本并替换内容；旧的在途渲染用 seq 失效 */
  async function renderAll() {
    if (width <= 0) return;
    const seq = ++renderSeq.current;
    setError("");
    try {
      const b64 = await readFileBase64(path);
      if (seq !== renderSeq.current) return;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      if (seq !== renderSeq.current) return;
      const container = containerRef.current;
      if (!container) return;
      // 先在离屏容器里渲染完整本，完成后再一次性替换，避免整页闪白
      const holder = document.createElement("div");
      const pages: PageEntry[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        if (seq !== renderSeq.current) return;
        const base = page.getViewport({ scale: 1 });
        const fit = Math.max(0.5, width / base.width);
        // 位图按物理像素渲染（×dpr），高分屏 125%/150% 缩放下文字不糊
        const viewport = page.getViewport({ scale: fit * dpr });
        const cssW = viewport.width / dpr;
        const cssH = viewport.height / dpr;
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        canvas.style.transformOrigin = "top left";
        const wrapper = document.createElement("div");
        wrapper.style.width = `${cssW}px`;
        wrapper.style.height = `${cssH}px`;
        wrapper.style.marginBottom = "8px";
        wrapper.appendChild(canvas);
        await page.render({ canvas, viewport }).promise;
        if (seq !== renderSeq.current) return;
        pages.push({ wrapper, canvas, fitW: fit * base.width, fitH: fit * base.height });
        holder.appendChild(wrapper);
      }
      if (seq !== renderSeq.current) return;
      pagesRef.current = pages;
      container.replaceChildren(holder);
    } catch (e) {
      if (seq === renderSeq.current) setError(String(e));
    }
  }

  /** 对已渲染的「适应宽度」位图做 transform 缩放：即时、零开销；
      zoom ≤ 1 时位图只会被缩小显示，清晰度不变差 */
  function applyZoom(z: number) {
    for (const p of pagesRef.current) {
      p.wrapper.style.width = `${p.fitW * z}px`;
      p.wrapper.style.height = `${p.fitH * z}px`;
      p.canvas.style.transform = z === 1 ? "none" : `scale(${z})`;
    }
  }

  // 主渲染：宽度 / dpr / 文件变化时按适应宽度渲染，再补上当前缩放变换
  useEffect(() => {
    (async () => {
      await renderAll();
      applyZoom(zoomRef.current);
    })();
    return () => {
      renderSeq.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, width, dpr]);

  // 缩放：仅 transform，即时生效
  useEffect(() => {
    applyZoom(zoom);
  }, [zoom]);

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
