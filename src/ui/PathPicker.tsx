// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Input } from "../components/ui/input";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUp, Folder, FileText } from "lucide-react";
import { homeDir, listDir, statPath } from "../ipc";
import type { DirEntry } from "../ipc/types";

interface Props {
  title: string;
  directory: boolean; // true：选目录；false：选文件
  onSelect: (path: string) => void;
  onClose: () => void;
}

/** 条目列表 memo 化：输入框击键不重渲上千行（/bin 这类目录） */
const EntryList = memo(function EntryList({
  entries,
  selected,
  onPick,
}: {
  entries: DirEntry[];
  selected: string | null;
  onPick: (e: DirEntry) => void;
}) {
  return (
    <>
      {entries.map((e) => (
        <div
          key={e.path}
          onClick={() => onPick(e)}
          className="flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-[var(--row-hover)]"
          style={{
            color: selected === e.path ? "var(--accent-foreground)" : "var(--text)",
            backgroundColor: selected === e.path ? "var(--accent)" : "transparent",
          }}
        >
          {e.is_dir ? (
            <Folder size={14} style={{ color: "var(--text-muted)" }} />
          ) : (
            <FileText size={14} style={{ color: "var(--text-muted)" }} />
          )}
          <span className="min-w-0 truncate text-xs">{e.name}</span>
        </div>
      ))}
    </>
  );
});

export default function PathPicker({ title, directory, onSelect, onClose }: Props) {
  const [cwd, setCwd] = useState("");
  const [parent, setParent] = useState("");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (path: string) => {
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
  }, []);

  useEffect(() => {
    homeDir()
      .then(load)
      .catch(() => load("/"));
  }, [load]);

  /** 回车 / 跳转：目录直接加载；文件模式下完整文件路径直接选中 */
  const go = useCallback(async () => {
    const path = cwd.trim();
    if (!path) return;
    const st = await statPath(path).catch(() => null);
    if (st && st.exists && !st.is_dir) {
      if (directory) {
        setError("这是一个文件，请选择目录");
        return;
      }
      setSelected(path);
      setError("");
      return;
    }
    load(path);
  }, [cwd, directory, load]);

  const onPick = useCallback(
    (e: DirEntry) => {
      if (e.is_dir) load(e.path);
      else setSelected(e.path);
    },
    [load],
  );

  const visible = useMemo(
    () => (directory ? entries.filter((e) => e.is_dir) : entries),
    [entries, directory],
  );

  return (
    <Dialog open onOpenChange={(o) => {
      if (!o) onClose();
    }}>
      <DialogContent className="flex h-[min(640px,84vh)] w-[min(800px,88vw)] flex-col rounded-lg p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text)" }}>
            {title}
          </span>
        </div>

        <div className="mb-2 flex gap-2">
          <Button variant="ghost" onClick={() => load(parent)} disabled={!parent || parent === cwd}>
            <ArrowUp size={14} />
          </Button>
          <Input
            value={cwd}
            onChange={(e) => {
              setCwd(e.currentTarget.value);
              setSelected(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") go();
            }}
            placeholder={directory ? "目录路径，回车跳转" : "文件或目录路径，回车确认"}
            className="h-8 flex-1 text-xs"
          />
          <Button variant="ghost" onClick={go}>
            跳转
          </Button>
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
            <EntryList entries={visible} selected={selected} onPick={onPick} />
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="min-w-0 truncate text-xs" style={{ color: "var(--text-muted)" }}>
            {directory ? `将选择：${cwd}` : selected ? selected : "请选择一个文件"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button
              variant="default"
              onClick={() => (directory ? onSelect(cwd) : selected && onSelect(selected))}
              disabled={!directory && !selected}
            >
              选择
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
