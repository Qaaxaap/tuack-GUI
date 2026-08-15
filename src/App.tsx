// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";
import Toolbar from "./ui/Toolbar";
import SideBar from "./ui/SideBar";
import MainPanel from "./ui/MainPanel";
import OutputDrawer from "./ui/OutputDrawer";
import PdfViewer from "./ui/PdfViewer";
import AddNodeModal from "./ui/AddNodeModal";
import RemoveConfirmModal from "./ui/RemoveConfirmModal";
import {
  cancelCommand,
  detectTuack,
  getFonts,
  getLastProject,
  getTheme,
  listDir,
  openProject,
  runCommand,
  saveLastProject,
  setTheme,
  setTuackPath,
} from "./ipc";
import { applyFonts } from "./fonts";
import { applyTheme, normalizeTheme, type AppTheme } from "./theme";
import type { Command, LastProject, NodeKind, ProcessEvent, Project } from "./ipc/types";

export default function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [binaryOk, setBinaryOk] = useState(false);
  const [binaryStatus, setBinaryStatus] = useState("检测中…");
  const [selected, setSelected] = useState<{ dir: string; kind: NodeKind } | null>(null);
  const [logs, setLogs] = useState<ProcessEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<number | null>(null);
  const [lastProject, setLastProject] = useState<LastProject | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [theme, setThemeState] = useState<AppTheme>("dark");
  const [addNode, setAddNode] = useState<{ target: "day" | "problem"; cwd: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    kind: "day" | "problem";
    name: string;
    parentDir: string;
  } | null>(null);

  async function refreshTuack() {
    try {
      const b = await detectTuack();
      setBinaryOk(true);
      setBinaryStatus(b.exe);
    } catch (e) {
      setBinaryOk(false);
      setBinaryStatus(String(e));
    }
  }

  useEffect(() => {
    refreshTuack();
    getLastProject()
      .then((lp) => {
        if (lp) setLastProject(lp);
      })
      .catch(() => {});
    getFonts()
      .then((f) => applyFonts(f.ui_font, f.mono_font))
      .catch(() => {});
    getTheme()
      .then((t) => {
        const th = normalizeTheme(t);
        applyTheme(th);
        setThemeState(th);
      })
      .catch(() => {});
  }, []);

  async function handleOpenProject(path: string) {
    const p = await openProject(path);
    setProject(p);
    setSelected({ dir: p.root, kind: "contest" });
    const name =
      p.contest.name || p.contest.title || path.split(/[\\/]/).filter(Boolean).pop() || path;
    setLastProject({ path, name });
    saveLastProject(path, name).catch(() => {});
  }

  async function handleSetTuack(path: string) {
    await setTuackPath(path);
    await refreshTuack();
  }

  function handleRun(cmd: Command, cwd: string) {
    setLogs([]);
    setRunning(true);
    runCommand(cmd, cwd, (e) => {
      setLogs((prev) => [...prev, e]);
      if (e.kind === "exited") {
        setRunning(false);
        if (e.code === 0 && cmd.command === "gen") {
          if (cmd.target === "contest" && cmd.names.length > 0) {
            // 新建比赛成功后直接打开它
            const root = `${cwd.replace(/[\\/]+$/, "")}/${cmd.names[0]}`;
            handleOpenProject(root).catch(() => {});
          } else if (project) {
            // 场次/题目/数据生成后刷新当前工程树
            openProject(project.root)
              .then((p) => setProject(p))
              .catch(() => {});
          }
        }
        if (cmd.command === "ren") {
          const dir = `${cwd}/statements/${cmd.template}`;
          listDir(dir)
            .then((res) => {
              const pdf = res.entries.find((x) => x.name.endsWith(".pdf"));
              if (pdf) setPdfPath(pdf.path);
            })
            .catch(() => {});
        }
      }
    })
      .then(setRunId)
      .catch((err) => {
        setLogs((prev) => [...prev, { kind: "output", data: String(err) }]);
        setRunning(false);
      });
  }

  function handleCancel() {
    if (runId != null) cancelCommand(runId);
  }

  function handleToggleTheme() {
    const next: AppTheme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setThemeState(next);
    setTheme(next).catch(() => {});
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Toolbar
        binaryOk={binaryOk}
        binaryStatus={binaryStatus}
        hasProject={project != null}
        selectedDir={selected?.dir ?? ""}
        lastProject={lastProject}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenProject={handleOpenProject}
        onSetTuack={handleSetTuack}
        onRunCommand={handleRun}
      />
      <div className="flex min-h-0 flex-1">
        <SideBar
          project={project}
          selectedDir={selected?.dir ?? ""}
          onSelect={(dir, kind) => setSelected({ dir, kind })}
          onAdd={(cwd, target) => setAddNode({ target, cwd })}
          onRemove={(parentDir, name, kind) => setRemoveTarget({ parentDir, name, kind })}
        />
        <MainPanel project={project} selected={selected} theme={theme} />
      </div>
      <OutputDrawer logs={logs} running={running} runId={runId} onCancel={handleCancel} />
      {pdfPath && <PdfViewer path={pdfPath} onClose={() => setPdfPath(null)} />}
      {addNode && (
        <AddNodeModal
          title={addNode.target === "day" ? "新建场次" : "新建题目"}
          label={addNode.target === "day" ? "场次名（可多个，空格分隔）" : "题目名（可多个，空格分隔）"}
          placeholder={addNode.target === "day" ? "如 day1 day2" : "如 prob1 prob2"}
          target={addNode.target}
          cwd={addNode.cwd}
          onRun={handleRun}
          onClose={() => setAddNode(null)}
        />
      )}
      {removeTarget && (
        <RemoveConfirmModal
          kind={removeTarget.kind}
          name={removeTarget.name}
          parentDir={removeTarget.parentDir}
          onRemoved={() => {
            if (project) {
              openProject(project.root)
                .then((p) => setProject(p))
                .catch(() => {});
            }
          }}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}
