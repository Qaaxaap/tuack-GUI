// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";
import { ArrowUp, Folder, FileText, X } from "lucide-react";
import { homeDir, listDir } from "../ipc";
import type { DirEntry } from "../ipc/types";

interface Props {
  title: string;
  directory: boolean; // true：选目录；false：选文件
  onSelect: (path: string) => void;
  onClose: () => void;
}

export default function PathPicker({ title, directory, onSelect, onClose }: Props) {
  const [cwd, setCwd] = useState("");
  const [parent, setParent] = useState("");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load(path: string) {
    try {
      const res = await listDir(path);
      setCwd(path);
      setParent(res.parent);
      setEntries(res.entries);
      setSelected(null);
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    homeDir()
      .then(load)
      .catch(() => load("/"));
  }, []);

  const visible = directory ? entries.filter((e) => e.is_dir) : entries;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
    >
      <div
        className="flex h-[420px] w-[560px] flex-col rounded-lg p-4"
        style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border)" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text)" }}>
            {title}
          </span>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="mb-2 flex gap-2">
          <button className="btn btn-ghost" onClick={() => load(parent)} disabled={!parent || parent === cwd}>
            <ArrowUp size={14} />
          </button>
          <input
            value={cwd}
            onChange={(e) => setCwd(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load(cwd);
            }}
            className="flex-1 rounded px-2 py-1 text-xs"
            style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
          <button className="btn btn-ghost" onClick={() => load(cwd)}>
            跳转
          </button>
        </div>

        <div className="mb-2 flex-1 overflow-auto rounded" style={{ border: "1px solid var(--border)" }}>
          {error ? (
            <div className="p-3 text-xs" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          ) : visible.length === 0 ? (
            <div className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>
              （空目录）
            </div>
          ) : (
            visible.map((e) => (
              <div
                key={e.path}
                onClick={() => {
                  if (e.is_dir) load(e.path);
                  else setSelected(e.path);
                }}
                className="flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-white/5"
                style={{ color: selected === e.path ? "var(--brand)" : "var(--text)" }}
              >
                {e.is_dir ? (
                  <Folder size={14} style={{ color: "var(--brand)" }} />
                ) : (
                  <FileText size={14} style={{ color: "var(--text-muted)" }} />
                )}
                <span className="truncate text-xs">{e.name}</span>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
            {directory ? `将选择：${cwd}` : selected ? selected : "请选择一个文件"}
          </span>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={() => (directory ? onSelect(cwd) : selected && onSelect(selected))}
              disabled={!directory && !selected}
            >
              选择
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
