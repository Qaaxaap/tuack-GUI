// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";

import { useEffect, useRef, useState } from "react";
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
  const [projMenu, setProjMenu] = useState(false);
  const [settingsMenu, setSettingsMenu] = useState(false);
  const [picker, setPicker] = useState<"open" | "tuack" | null>(null);
  const [fmPicker, setFmPicker] = useState(false);
  const [fileManager, setFileManager] = useState<string | null>(null);
  const projMenuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getFileManager()
      .then((fm) => setFileManager(fm))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (projMenuRef.current && !projMenuRef.current.contains(e.target as Node)) {
        setProjMenu(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsMenu(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function openLast() {
    if (!lastProject) return;
    setProjMenu(false);
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
          <span className="inline-flex items-center gap-1">
            <Plus size={13} />
            新建工程
          </span>
        </Button>

        <div ref={projMenuRef} className="relative">
          <Button variant="ghost" onClick={() => setProjMenu(!projMenu)}>
            <span className="inline-flex items-center gap-1">
              打开工程
              <ChevronDown size={12} />
            </span>
          </Button>
          {projMenu && (
            <div
              className="absolute right-0 z-20 mt-1 w-80 overflow-hidden rounded"
              style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border)" }}
            >
              <button
                onClick={() => {
                  setProjMenu(false);
                  setPicker("open");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-white/5"
                style={{ color: "var(--text)" }}
              >
                <FolderOpen size={14} style={{ color: "var(--text-muted)" }} />
                浏览目录…
              </button>
              {lastProject && (
                <button
                  onClick={openLast}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-white/5"
                  style={{ color: "var(--text)" }}
                  title={lastProject.path}
                >
                  <FolderOpen size={14} style={{ color: "var(--brand)" }} />
                  <span className="shrink-0 font-medium">{lastProject.name}</span>
                  <span className="truncate" style={{ color: "var(--text-muted)" }}>
                    {lastProject.path}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        <Button variant="ghost" onClick={() => setPicker("tuack")}>
          设置 tuack-ng
        </Button>
        <Button variant="default" onClick={() => setShowCmd(true)} disabled={!hasProject}>
          <span className="inline-flex items-center gap-1">
            <Play size={13} />
            运行命令
          </span>
        </Button>

        <div ref={settingsRef} className="relative">
          <Button
            variant="ghost"
            onClick={() => setSettingsMenu(!settingsMenu)}
            title="设置"
          >
            <Settings size={14} />
          </Button>
          {settingsMenu && (
            <div
              className="absolute right-0 z-20 mt-1 w-72 overflow-hidden rounded"
              style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border)" }}
            >
              <div className="px-3 py-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                文件管理器：{fileManager ?? "自动检测"}
              </div>
              <button
                onClick={() => {
                  setSettingsMenu(false);
                  setFmPicker(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-white/5"
                style={{ color: "var(--text)" }}
              >
                <Settings size={14} style={{ color: "var(--text-muted)" }} />
                设置文件管理器…
              </button>
              {fileManager && (
                <button
                  onClick={() => {
                    setSettingsMenu(false);
                    saveFileManager("")
                      .then(() => setFileManager(null))
                      .catch(() => {});
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-white/5"
                  style={{ color: "var(--text)" }}
                  title={fileManager}
                >
                  <span className="truncate" style={{ color: "var(--text-muted)" }}>
                    恢复自动检测（{fileManager}）
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
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
