// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// 题面预览：
// - 单题（day/problem）：Markdown 预览（ren/preview + MathJax SVG），可切换 PDF 预览（ren/run）
// - 场次（day）：只能 PDF 预览（ren/preview 的 scope 必须定位到单题）
//   GFM 表格（< / ^ 合并）、LaTeX、:::figure、图片属性来自 CNOI（见 THIRD_PARTY_LICENSES.md）。

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeMathjax from "rehype-mathjax";
import rehypeHighlight from "rehype-highlight";
import remarkDirective from "remark-directive";
import { defaultHandlers } from "mdast-util-to-hast";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import PdfCanvas from "./PdfViewer";
import { getLatestRender, getPreview, runPreview, runRender } from "../rpc/runner";
import { reportError } from "../errors";
import remarkImageAttr from "../lib/remarkImageAttr";
import { rehypeLineMap } from "../lib/rehypeLineMap";
import { rehypeTableMerge } from "../lib/rehypeTableMerge";
import { smoothScrollTo } from "../lib/smoothScroll";
import { isActiveSide, lockSide, releaseLock, type SyncSide } from "../lib/syncLock";

// remark-rehype handlers：渲染容器 directive（:::figure）与图片属性
// 注：表格合并不走 tableCell handler（remark-rehype 的 tableRow 内联处理单元格），
// 由 rehypeTableMerge 在 hast 层完成。
const handlers: any = {
  ...defaultHandlers,
  containerDirective(state: any, node: any) {
    const name = node.name as string;
    const props: Record<string, unknown> = { className: `directive-${name}` };
    if (node.attributes) {
      for (const [k, v] of Object.entries(node.attributes)) {
        if (v != null) props[`data-${k}`] = String(v);
      }
    }
    const children = state.all(node);
    return { type: "element", tagName: "div", properties: props, children };
  },
  image(state: any, node: any) {
    const result = defaultHandlers.image(state, node);
    const attr = node.data?.attr as Record<string, string | undefined> | undefined;
    if (attr?.width) result.properties.width = attr.width;
    if (attr?.height) result.properties.height = attr.height;
    return result;
  },
};

interface Props {
  /** 节点相对工程根的 scope */
  scope: string;
  /** 已解析的 ren 模板名 */
  template: string;
  /** 触发重新获取预览时自增 */
  refreshKey: number;
  running: boolean;
  onRender: () => void;
  /** 分屏模式下带左边框 */
  bordered?: boolean;
  /** 预览滚动到某模板行时回调（供编辑器联动） */
  onPreviewScroll?: (source: number) => void;
  ref?: Ref<PreviewPaneHandle>;
}

/** Markdown 预览主体（ren/preview），支持与编辑器同步滚动 */
interface MarkdownBodyHandle {
  /** 编辑器光标/滚动 → 预览滚动到对应模板行（等比例定位）；animated=false 瞬时（滚动跟手） */
  scrollToLine: (source: number, ratio?: number, animated?: boolean) => void;
}

function MarkdownBody({
  scope,
  template,
  refreshKey,
  onPreviewScroll,
  ref,
}: {
  scope: string;
  template: string;
  refreshKey: number;
  onPreviewScroll: (source: number) => void;
  ref?: Ref<MarkdownBodyHandle>;
}) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lineMap, setLineMap] = useState<{ source: number; rendered: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  /** rAF 合帧：高频滚动时每帧最多查找一次，避免重复 reflow */
  const rafRef = useRef<number | null>(null);

  /** 用户滚动来源：加锁标记。滚动条拖动（pointerdown）由 pointerup 释放；
   *  滚轮/触控板（wheel）由 scrollend 释放 */
  const SIDE: SyncSide = "preview";
  /** 拖动滚动条期间：scrollend 会误判"停止"提前释放锁，须屏蔽 */
  const pointerDragging = useRef(false);
  const handleUserPointerDown = () => {
    lockSide(SIDE);
    pointerDragging.current = true;
    const release = () => {
      pointerDragging.current = false;
      releaseLock(SIDE);
    };
    window.addEventListener("pointerup", release, { once: true });
    window.addEventListener("pointercancel", release, { once: true });
  };
  const handleUserWheel = () => {
    lockSide(SIDE);
  };
  const handleScrollEnd = () => {
    if (pointerDragging.current) return; // 拖动中不释放
    releaseLock(SIDE);
  };

  // 编辑器光标/滚动 → 预览滚动到对应行（顶部对齐，直接调用，绕过 React 渲染）
  useImperativeHandle(
    ref,
    () => ({
      scrollToLine: (source: number, ratio = 0, animated = true) => {
        const m = lineMap.find((x) => x.source === source);
        if (!m) return;
        const container = scrollRef.current;
        if (!container) return;
        const els = container.querySelectorAll<HTMLElement>("[data-line]") ?? [];
        let best: HTMLElement | null = null;
        let bestLine = -1;
        for (const el of els) {
          const ln = Number(el.dataset.line);
          if (ln <= m.rendered && ln > bestLine) {
            bestLine = ln;
            best = el;
          }
        }
        if (!best) return;
        const elRect = best.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        // 等比例定位：目标块滚到容器顶部偏移 = 视口高度 * ratio
        const top = container.scrollTop + (elRect.top - cRect.top) - container.clientHeight * ratio;
        if (animated) {
          smoothScrollTo(container, top);
        } else {
          container.scrollTop = top;
        }
      },
    }),
    [lineMap],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const cached = getPreview(scope);
    if (cached) {
      setMarkdown(cached.markdown);
      setWarnings(cached.warnings);
      setLineMap(cached.lineMap);
    }
    (async () => {
      try {
        const res = await runPreview(scope, template);
        if (!alive) return;
        setMarkdown(res.markdown);
        setWarnings(res.warnings);
        setLineMap(res.lineMap);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError(`预览加载失败：${e instanceof Error ? e.message : String(e)}`);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [scope, template, refreshKey]);

  // 预览滚动 → 通知编辑器（活动侧互斥锁：仅用户滚动的活动侧反向联动）
  const handleScroll = () => {
    if (!isActiveSide(SIDE)) return;
    if (rafRef.current != null) return; // 本帧已排队
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const container = scrollRef.current;
      if (!container || lineMap.length === 0) return;
      // 取视口顶部第一个可见块（与编辑器 y:"start" 顶部对齐对称）
      const containerTop = container.getBoundingClientRect().top;
      let bestLine: number | null = null;
      let bestRel = Infinity;
      for (const el of container.querySelectorAll<HTMLElement>("[data-line]")) {
        const rel = el.getBoundingClientRect().top - containerTop;
        if (rel >= -5 && rel < bestRel) {
          bestRel = rel;
          bestLine = Number(el.dataset.line);
        }
      }
      if (bestLine == null) return;
      const m = lineMap.find((x) => x.rendered === bestLine);
      if (m) onPreviewScroll(m.source);
    });
  };

  // 滚动真正停止（scrollend）时释放活动侧锁（覆盖触控板惯性等浏览器平滑滚动）
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.addEventListener("scrollend", handleScrollEnd);
    return () => container.removeEventListener("scrollend", handleScrollEnd);
  }, [markdown]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {markdown == null ? (
        // 无已保留内容：仅显示加载中 / 错误
        error ? (
          <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-xs" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-xs" style={{ color: "var(--text-muted)" }}>
            {loading ? "加载预览…" : "暂无预览内容"}
          </div>
        )
      ) : (
        <>
          {/* 预览失败：保留已有内容，错误块固定显示在顶部（不随内容滚动） */}
          {error && (
            <div className="shrink-0 rounded border px-3 py-2 text-xs" style={{ borderColor: "var(--danger)", color: "var(--danger)", backgroundColor: "var(--bg)" }}>
              {error}
            </div>
          )}
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-auto"
            onScroll={handleScroll}
            onWheel={handleUserWheel}
            onPointerDown={handleUserPointerDown}
          >
            <div className="p-4">
            {warnings.length > 0 && (
              <div className="mb-3 rounded border px-3 py-2 text-xs" style={{ borderColor: "#e5e510", color: "#e5e510" }}>
                {warnings.join("；")}
              </div>
            )}
            <div className="md-body">
              <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm, remarkImageAttr, remarkDirective]}
                rehypePlugins={[rehypeMathjax, rehypeHighlight, rehypeLineMap, rehypeTableMerge]}
                remarkRehypeOptions={{ handlers }}
          components={{
            // `:::figure{caption=...}` -> <figure> + <figcaption>
            div: (props) => {
              const cls = props.className;
              if (typeof cls === "string" && cls.includes("directive-figure")) {
                const caption = (props as any)["data-caption"] as string | undefined;
                return (
                  <figure className="md-figure">
                    {props.children}
                    {caption ? <figcaption>{caption}</figcaption> : null}
                  </figure>
                );
              }
              return <div {...props} />;
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

/** PDF 预览主体（ren/run 产物，服务端临时目录） */
function PdfBody({
  scope,
  refreshKey,
  running,
  onPdfRender,
}: {
  scope: string;
  refreshKey: number;
  running: boolean;
  onPdfRender: () => void;
}) {
  const [pdf, setPdf] = useState<string | null>(null);
  useEffect(() => {
    const fin = getLatestRender(scope);
    let hit: string | null = null;
    if (fin?.tmpDir && fin.files) {
      const p = fin.files.find((f) => f.path.toLowerCase().endsWith(".pdf"));
      if (p) hit = `${fin.tmpDir.replace(/[\\/]+$/, "")}/${p.path.replace(/\\/g, "/")}`;
    }
    setPdf(hit);
  }, [scope, refreshKey]);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      {pdf ? (
        <PdfCanvas path={pdf} zoom={1} refreshKey={refreshKey} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <FileText size={28} style={{ color: "var(--text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            还没有渲染结果，运行 ren 后在这里预览
          </p>
          <Button variant="default" onClick={onPdfRender} disabled={running}>
            渲染
          </Button>
        </div>
      )}
    </div>
  );
}

export interface PreviewPaneHandle {
  /** 编辑器光标/滚动 → 预览滚动到对应模板行（等比例定位）；animated=false 瞬时 */
  scrollToLine: (source: number, ratio?: number, animated?: boolean) => void;
}

export default function PreviewPane({
  scope,
  template,
  refreshKey,
  running,
  onRender,
  bordered,
  onPreviewScroll,
  ref,
}: Props) {
  // 单题（day/problem）用 Markdown 预览；场次（day）只能 PDF 预览
  const isProblem = scope.split("/").length === 2;
  const [view, setView] = useState<"md" | "pdf">("md");
  const [pdfRefresh, setPdfRefresh] = useState(0);
  const mdRef = useRef<MarkdownBodyHandle>(null);

  // 转发同步滚动到 Markdown 预览主体
  useImperativeHandle(
    ref,
    () => ({
      scrollToLine: (source: number, ratio = 0, animated = true) =>
        mdRef.current?.scrollToLine(source, ratio, animated),
    }),
    [],
  );

  // PDF 渲染（PreviewPane 内部管理，用于 day 强制 PDF / problem 切到 PDF）
  const handlePdfRender = () => {
    if (running) return;
    runRender(scope, template)
      .then(() => setPdfRefresh((r) => r + 1))
      .catch((e) => reportError(`渲染失败：${e}`));
  };

  const effectiveView: "md" | "pdf" = isProblem ? view : "pdf";

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      style={bordered ? { borderLeft: "1px solid var(--border)" } : undefined}
    >
      <div
        className="flex h-9 shrink-0 items-center gap-1 px-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="min-w-0 flex-1 truncate text-xs" style={{ color: "var(--text-muted)" }}>
          {isProblem ? "题面预览" : "PDF 预览"}
        </span>
        {isProblem && (
          <div className="flex items-center rounded border" style={{ borderColor: "var(--border)" }}>
            {(
              [
                ["md", "题面"],
                ["pdf", "PDF"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className="px-2 py-1 text-[11px]"
                style={
                  view === id
                    ? { backgroundColor: "var(--brand)", color: "#fff" }
                    : { color: "var(--text-muted)" }
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {effectiveView === "md" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-2 text-xs"
            onClick={onRender}
            disabled={running}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            刷新预览
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-2 text-xs"
            onClick={handlePdfRender}
            disabled={running}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            重新渲染
          </Button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {effectiveView === "md" ? (
          <MarkdownBody
            ref={mdRef}
            scope={scope}
            template={template}
            refreshKey={refreshKey}
            onPreviewScroll={onPreviewScroll ?? (() => {})}
          />
        ) : (
          <PdfBody
            scope={scope}
            refreshKey={refreshKey + pdfRefresh}
            running={running}
            onPdfRender={handlePdfRender}
          />
        )}
      </div>
    </div>
  );
}
