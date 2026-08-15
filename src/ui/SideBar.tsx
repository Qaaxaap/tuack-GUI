// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { ChevronRight, ChevronDown, FileText, ExternalLink, Plus, Minus } from "lucide-react";
import { Button } from "../components/ui/button";
import type { ContestNode, DayNode, NodeKind, ProblemNode, Project } from "../ipc/types";
import { openInFileManager } from "../ipc";

interface Props {
  project: Project | null;
  selectedDir: string;
  onSelect: (dir: string, kind: NodeKind) => void;
  onAdd: (cwd: string, target: "day" | "problem") => void;
  onRemove: (parentDir: string, name: string, kind: "day" | "problem") => void;
}

export default function SideBar({ project, selectedDir, onSelect, onAdd, onRemove }: Props) {
  return (
    <aside
      className="flex w-64 shrink-0 flex-col"
      style={{ backgroundColor: "var(--bg-raised)", borderRight: "1px solid var(--border)" }}
    >
      <div
        className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        工程
      </div>
      {project ? (
        <div className="flex-1 overflow-auto py-1">
          <ContestItem
            node={project.contest}
            selectedDir={selectedDir}
            onSelect={onSelect}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        </div>
      ) : (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          <p className="text-sm">尚未打开工程</p>
          <p className="text-xs">点工具栏「打开工程」</p>
        </div>
      )}
    </aside>
  );
}

function rowStyle(active: boolean) {
  return {
    backgroundColor: active ? "var(--accent)" : "transparent",
    color: active ? "var(--accent-foreground)" : "var(--text)",
  };
}

/** 行尾悬浮显示的图标按钮（+ / − / 文件管理器） */
function RowIcon({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className="mr-1 h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 [&_svg]:size-[13px]"
    >
      {children}
    </Button>
  );
}

function OpenFolder({ dir }: { dir: string }) {
  return (
    <RowIcon title="在文件管理器中打开" onClick={() => openInFileManager(dir)}>
      <ExternalLink size={13} />
    </RowIcon>
  );
}

interface ItemHandlers {
  selectedDir: string;
  onSelect: (dir: string, kind: NodeKind) => void;
  onAdd: (cwd: string, target: "day" | "problem") => void;
  onRemove: (parentDir: string, name: string, kind: "day" | "problem") => void;
}

function ContestItem({ node, selectedDir, onSelect, onAdd, onRemove }: { node: ContestNode } & ItemHandlers) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <div className="group flex items-center hover:bg-[var(--row-hover)]" style={rowStyle(selectedDir === node.dir)}>
        <Button
          variant="ghost"
          onClick={() => {
            onSelect(node.dir, "contest");
            setOpen(!open);
          }}
          className="h-6 min-w-0 flex-1 justify-start gap-1 rounded-none px-2 py-1 text-left text-xs font-normal [&_svg]:size-[14px]"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="truncate">{node.title || node.name}</span>
        </Button>
        <RowIcon title="新建场次" onClick={() => onAdd(node.dir, "day")}>
          <Plus size={13} />
        </RowIcon>
        <OpenFolder dir={node.dir} />
      </div>
      {open && (
        <div className="pl-4">
          {node.days.map((d) => (
            <DayItem
              key={d.dir}
              node={d}
              parentDir={node.dir}
              selectedDir={selectedDir}
              onSelect={onSelect}
              onAdd={onAdd}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DayItem({
  node,
  parentDir,
  selectedDir,
  onSelect,
  onAdd,
  onRemove,
}: { node: DayNode; parentDir: string } & ItemHandlers) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="group flex items-center hover:bg-[var(--row-hover)]" style={rowStyle(selectedDir === node.dir)}>
        <Button
          variant="ghost"
          onClick={() => {
            onSelect(node.dir, "day");
            setOpen(!open);
          }}
          className="h-6 min-w-0 flex-1 justify-start gap-1 rounded-none px-2 py-1 text-left text-xs font-normal [&_svg]:size-[14px]"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="truncate">{node.title || node.name}</span>
        </Button>
        <RowIcon title="新建题目" onClick={() => onAdd(node.dir, "problem")}>
          <Plus size={13} />
        </RowIcon>
        <RowIcon title="删除场次（仅从配置移除）" onClick={() => onRemove(parentDir, node.name, "day")}>
          <Minus size={13} />
        </RowIcon>
        <OpenFolder dir={node.dir} />
      </div>
      {open && (
        <div className="pl-4">
          {node.problems.map((p) => (
            <ProblemItem
              key={p.dir}
              node={p}
              parentDir={node.dir}
              selectedDir={selectedDir}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProblemItem({
  node,
  parentDir,
  selectedDir,
  onSelect,
  onRemove,
}: { node: ProblemNode; parentDir: string } & Omit<ItemHandlers, "onAdd">) {
  return (
    <div className="group flex items-center hover:bg-[var(--row-hover)]" style={rowStyle(selectedDir === node.dir)}>
      <Button
        variant="ghost"
        onClick={() => onSelect(node.dir, "problem")}
        className="h-6 min-w-0 flex-1 justify-start gap-1.5 rounded-none px-2 py-1 text-left text-xs font-normal [&_svg]:size-[13px]"
      >
        <FileText size={13} />
        <span className="truncate">{node.title || node.name}</span>
      </Button>
      <RowIcon title="删除题目（仅从配置移除）" onClick={() => onRemove(parentDir, node.name, "problem")}>
        <Minus size={13} />
      </RowIcon>
      <OpenFolder dir={node.dir} />
    </div>
  );
}
