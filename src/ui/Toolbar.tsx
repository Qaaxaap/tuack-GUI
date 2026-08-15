// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

import { useEffect, useState } from "react";
import { Sparkles, Play, Plus, ChevronDown, FolderOpen, Settings } from "lucide-react";
import CommandPanel from "./CommandPanel";
import NewProjectModal from "./NewProjectModal";
import PathPicker from "./PathPicker";
import { getFileManager, saveFileManager } from "../ipc";
import type { Command } from "../ipc/types";

interface Props {
  binaryOk: boolean;
  binaryStatus: string;
  hasProject: boolean;
  selectedDir: string;
  lastProject: { path: string; name: string } | null;
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
  onOpenProject,
  onSetTuack,
  onRunCommand,
}: Props) {
  const [showCmd, setShowCmd] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [picker, setPicker] = useState<"open" | "tuack" | null>(null);
  const [fmPicker, setFmPicker] = useState(false);
  const [fileManager, setFileManager] = useState<string | null>(null);

  useEffect(() => {
    getFileManager()
      .then((fm) => setFileManager(fm))
      .catch(() => {});
  }, []);

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
        <Sparkles size={18} style={{ color: "var(--brand)" }} />
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
            <DropdownMenuItem onClick={() => setPicker("open")}>
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

        <Button variant="ghost" onClick={() => setPicker("tuack")}>
          设置 tuack-ng
        </Button>
        <Button variant="default" onClick={() => setShowCmd(true)} disabled={!hasProject}>
          <Play />
          运行命令
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="设置">
              <Settings />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72">
            <DropdownMenuLabel className="text-[11px] text-muted-foreground">
              文件管理器：{fileManager ?? "自动检测"}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setFmPicker(true)}>
              <Settings />
              设置文件管理器…
            </DropdownMenuItem>
            {fileManager && (
              <DropdownMenuItem
                onClick={() =>
                  saveFileManager("")
                    .then(() => setFileManager(null))
                    .catch(() => {})
                }
                title={fileManager}
              >
                <span className="truncate text-muted-foreground">恢复自动检测（{fileManager}）</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
      {picker === "open" && (
        <PathPicker
          title="选择 contest 目录"
          directory
          onSelect={(p) => {
            setPicker(null);
            onOpenProject(p).catch(() => {});
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "tuack" && (
        <PathPicker
          title="选择 tuack-ng 可执行文件"
          directory={false}
          onSelect={(p) => {
            setPicker(null);
            onSetTuack(p).catch(() => {});
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {fmPicker && (
        <PathPicker
          title="选择文件管理器可执行文件"
          directory={false}
          onSelect={(p) => {
            setFmPicker(false);
            saveFileManager(p)
              .then(() => setFileManager(p))
              .catch(() => {});
          }}
          onClose={() => setFmPicker(false)}
        />
      )}
    </header>
  );
}
