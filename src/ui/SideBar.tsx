// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { ChevronRight, ChevronDown, FileText, ExternalLink } from "lucide-react";
import { Button } from "../components/ui/button";
import type { ContestNode, DayNode, NodeKind, ProblemNode, Project } from "../ipc/types";
import { openInFileManager } from "../ipc";

interface Props {
  project: Project | null;
  selectedDir: string;
  onSelect: (dir: string, kind: NodeKind) => void;
}

export default function SideBar({ project, selectedDir, onSelect }: Props) {
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
          <ContestItem node={project.contest} selectedDir={selectedDir} onSelect={onSelect} />
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
    backgroundColor: active ? "rgba(99,102,241,0.15)" : "transparent",
    color: "var(--text)",
  };
}

function OpenFolder({ dir }: { dir: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        openInFileManager(dir);
      }}
      title="在文件管理器中打开"
      className="mr-1 h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 [&_svg]:size-[13px]"
    >
      <ExternalLink size={13} />
    </Button>
  );
}

function ContestItem({
  node,
  selectedDir,
  onSelect,
}: {
  node: ContestNode;
  selectedDir: string;
  onSelect: (dir: string, kind: NodeKind) => void;
}) {
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
        <OpenFolder dir={node.dir} />
      </div>
      {open && (
        <div className="pl-4">
          {node.days.map((d) => (
            <DayItem key={d.dir} node={d} selectedDir={selectedDir} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function DayItem({
  node,
  selectedDir,
  onSelect,
}: {
  node: DayNode;
  selectedDir: string;
  onSelect: (dir: string, kind: NodeKind) => void;
}) {
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
        <OpenFolder dir={node.dir} />
      </div>
      {open && (
        <div className="pl-4">
          {node.problems.map((p) => (
            <ProblemItem key={p.dir} node={p} selectedDir={selectedDir} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProblemItem({
  node,
  selectedDir,
  onSelect,
}: {
  node: ProblemNode;
  selectedDir: string;
  onSelect: (dir: string, kind: NodeKind) => void;
}) {
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
      <OpenFolder dir={node.dir} />
    </div>
  );
}
