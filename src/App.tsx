// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";
import Toolbar from "./ui/Toolbar";
import SideBar from "./ui/SideBar";
import MainPanel from "./ui/MainPanel";
import OutputDrawer from "./ui/OutputDrawer";
import PdfViewer from "./ui/PdfViewer";
import {
  cancelCommand,
  detectTuack,
  getFonts,
  getLastProject,
  listDir,
  openProject,
  runCommand,
  saveLastProject,
  setTuackPath,
} from "./ipc";
import { applyFonts } from "./fonts";
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
        setLogs((prev) => [...prev, { kind: "stderr", line: String(err) }]);
        setRunning(false);
      });
  }

  function handleCancel() {
    if (runId != null) cancelCommand(runId);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Toolbar
        binaryOk={binaryOk}
        binaryStatus={binaryStatus}
        hasProject={project != null}
        selectedDir={selected?.dir ?? ""}
        lastProject={lastProject}
        onOpenProject={handleOpenProject}
        onSetTuack={handleSetTuack}
        onRunCommand={handleRun}
      />
      <div className="flex min-h-0 flex-1">
        <SideBar project={project} selectedDir={selected?.dir ?? ""} onSelect={(dir, kind) => setSelected({ dir, kind })} />
        <MainPanel project={project} selected={selected} />
      </div>
      <OutputDrawer logs={logs} running={running} onCancel={handleCancel} />
      {pdfPath && <PdfViewer path={pdfPath} onClose={() => setPdfPath(null)} />}
    </div>
  );
}
