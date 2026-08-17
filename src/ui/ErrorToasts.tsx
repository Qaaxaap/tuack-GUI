// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { onError } from "../errors";

interface Toast {
  id: number;
  message: string;
}

let nextId = 1;

/** 右下角错误提示栈：自动消失，可手动关闭 */
export default function ErrorToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return onError((message) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-4), { id, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 shadow-lg"
          style={{
            backgroundColor: "var(--popover)",
            borderColor: "var(--danger)",
          }}
        >
          <span
            className="min-w-0 flex-1 break-all text-xs leading-relaxed"
            style={{ color: "var(--text)" }}
          >
            {t.message}
          </span>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="shrink-0"
            style={{ color: "var(--text-muted)" }}
            title="关闭"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
