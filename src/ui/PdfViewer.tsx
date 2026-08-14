// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { readFileBase64 } from "../ipc";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface Props {
  path: string;
  onClose: () => void;
}

export default function PdfViewer({ path, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const b64 = await readFileBase64(path);
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        const container = containerRef.current;
        if (!container) return;
        container.replaceChildren();
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.marginBottom = "8px";
          await page.render({ canvas, viewport }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="flex h-[90vh] w-[72vw] flex-col rounded-lg p-4"
        style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border)" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text)" }}>
            PDF 预览
          </span>
          <button className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>
        <div
          ref={containerRef}
          className="flex-1 overflow-auto rounded"
          style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}
        >
          {error && (
            <div className="p-3 text-xs" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
