// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { FileText } from "lucide-react";

interface Props {
  dir: string;
}

/** 题面 Markdown 编辑器（占位，编辑器本体后续接入） */
export default function StatementEditor({ dir }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 p-4">
      <FileText size={28} style={{ color: "var(--text-muted)" }} />
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        题面 Markdown 编辑器即将加入
      </p>
      <p className="max-w-md break-all text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
        {dir}
      </p>
    </div>
  );
}
