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
import SettingsDialog from "./SettingsDialog";
import type { Command } from "../ipc/types";
import type { AppTheme } from "../theme";

interface Props {
  binaryOk: boolean;
  binaryStatus: string;
  hasProject: boolean;
  selectedDir: string;
  lastProject: { path: string; name: string } | null;
  theme: AppTheme;
  onToggleTheme: () => void;
  onOpenProject: (path: string) => Promise<void>;
  onSetTuack: (path: string) => Promise<void>;
  onRunCommand: (cmd: Command, cwd: string) => void;
}

export default function Toolbar({
  binaryOk,
  binaryStatus,
  hasProject,
  selectedDir,
  lastProject,
  theme,
  onToggleTheme,
  onOpenProject,
  onSetTuack,
  onRunCommand,
}: Props) {
  const [showCmd, setShowCmd] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

      <span
        className="truncate text-xs"
        title={binaryStatus}
        style={{ color: binaryOk ? "var(--success)" : "var(--text-muted)" }}
      >
        tuack-ng：{binaryOk ? "已检测" : "未检测到"}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" onClick={() => setShowNew(true)}>
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
                <span className="truncate text-muted-foreground">{lastProject.path}</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="default" onClick={() => setShowCmd(true)} disabled={!hasProject}>
          <Play />
          运行命令
        </Button>

        <Button variant="ghost" size="icon" title="设置" onClick={() => setShowSettings(true)}>
          <Settings />
        </Button>
      </div>

      {showCmd && (
        <CommandPanel
          defaultCwd={selectedDir}
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
      {showSettings && (
        <SettingsDialog
          binaryStatus={binaryStatus}
          onSetTuack={onSetTuack}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onClose={() => setShowSettings(false)}
        />
      )}
    </header>
  );
}
