// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

import { useState } from "react";
import { Play, Plus, ChevronDown, FolderOpen, Settings } from "lucide-react";
import TuackLogo from "./TuackLogo";
import CommandPanel from "./CommandPanel";
import NewProjectModal from "./NewProjectModal";
import PathPicker from "./PathPicker";
import type { Command } from "../ipc/types";

interface Props {
  hasProject: boolean;
  selectedDir: string;
  projectRoot: string;
  lastProject: { path: string; name: string } | null;
  onRequireTuack: () => boolean;
  onOpenSettings: () => void;
  onOpenProject: (path: string) => Promise<void>;
  onRunCommand: (cmd: Command, cwd: string) => void;
}

export default function Toolbar({
  hasProject,
  selectedDir,
  projectRoot,
  lastProject,
  onRequireTuack,
  onOpenSettings,
  onOpenProject,
  onRunCommand,
}: Props) {
  const [showCmd, setShowCmd] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [openPicker, setOpenPicker] = useState(false);

  async function openLast() {
    if (!lastProject) return;
    await onOpenProject(lastProject.path).catch(() => {});
  }

  return (
    <header
      className="flex h-12 shrink-0 items-center gap-4 px-4"
      style={{ backgroundColor: "var(--bg-raised)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2">
        <TuackLogo size={18} />
        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Tuack-GUI
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            if (!onRequireTuack()) return;
            setShowNew(true);
          }}
        >
          <Plus />
          新建工程
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">
              打开工程
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            <DropdownMenuItem onClick={() => setOpenPicker(true)}>
              <FolderOpen />
              浏览目录…
            </DropdownMenuItem>
            {lastProject && (
              <DropdownMenuItem onClick={openLast} title={lastProject.path}>
                <FolderOpen />
                <span className="shrink-0 font-medium">{lastProject.name}</span>
                <span className="min-w-0 truncate text-muted-foreground">{lastProject.path}</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="default"
          onClick={() => {
            if (!onRequireTuack()) return;
            setShowCmd(true);
          }}
          disabled={!hasProject}
        >
          <Play />
          运行命令
        </Button>

        <Button variant="ghost" size="icon" title="设置" onClick={onOpenSettings}>
          <Settings />
        </Button>
      </div>

      {showCmd && (
        <CommandPanel
          defaultCwd={selectedDir}
          projectRoot={projectRoot}
          onRun={(cmd, cwd) => {
            setShowCmd(false);
            onRunCommand(cmd, cwd);
          }}
          onClose={() => setShowCmd(false)}
        />
      )}
      {showNew && (
        <NewProjectModal
          onRun={(cmd, cwd) => {
            setShowNew(false);
            onRunCommand(cmd, cwd);
          }}
          onClose={() => setShowNew(false)}
        />
      )}
      {openPicker && (
        <PathPicker
          title="选择 contest 目录"
          directory
          onSelect={(p) => {
            setOpenPicker(false);
            onOpenProject(p).catch(() => {});
          }}
          onClose={() => setOpenPicker(false)}
        />
      )}
    </header>
  );
}
