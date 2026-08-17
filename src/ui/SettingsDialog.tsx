// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import PathPicker from "./PathPicker";
import FontSettingsModal from "./FontSettingsModal";
import Select from "./Select";
import { getFileManager, getRenDefaults, saveFileManager, setRenGlobal } from "../ipc";
import { TEMPLATES } from "../templates";
import { reportError } from "../errors";
import type { AppTheme } from "../theme";

interface Props {
  binaryStatus: string;
  custom: boolean;
  onSetTuack: (path: string) => Promise<void>;
  onRestoreDefault: () => void;
  theme: AppTheme;
  onToggleTheme: () => void;
  onClose: () => void;
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs" style={{ color: "var(--text)" }}>{label}</div>
        {value !== undefined && (
          <div className="truncate text-[11px]" style={{ color: "var(--text-muted)" }} title={value}>
            {value}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </div>
  );
}

export default function SettingsDialog({
  binaryStatus,
  custom,
  onSetTuack,
  onRestoreDefault,
  theme,
  onToggleTheme,
  onClose,
}: Props) {
  const [fileManager, setFileManager] = useState<string | null>(null);
  const [fmPicker, setFmPicker] = useState(false);
  const [tuackPicker, setTuackPicker] = useState(false);
  const [showFonts, setShowFonts] = useState(false);
  const [renGlobal, setRenGlobalState] = useState("");

  useEffect(() => {
    getFileManager()
      .then((fm) => setFileManager(fm))
      .catch((e) => reportError(`读取文件管理器设置失败：${e}`));
    getRenDefaults("")
      .then((d) => setRenGlobalState(d.global ?? ""))
      .catch((e) => reportError(`读取 ren 默认模板失败：${e}`));
  }, []);

  return (
    <Dialog open onOpenChange={(o) => {
      if (!o) onClose();
    }}>
      <DialogContent className="w-[min(640px,80vw)] rounded-lg p-4">
        <div className="mb-1 text-sm" style={{ color: "var(--text)" }}>设置</div>

        <Row label="tuack-ng" value={binaryStatus}>
          <Button variant="ghost" onClick={() => setTuackPicker(true)}>选择可执行文件…</Button>
          {custom && (
            <Button variant="ghost" onClick={onRestoreDefault}>恢复默认</Button>
          )}
        </Row>

        <Row label="文件管理器" value={fileManager ?? "自动检测"}>
          <Button variant="ghost" onClick={() => setFmPicker(true)}>设置…</Button>
          {fileManager && (
            <Button
              variant="ghost"
              onClick={() =>
                saveFileManager("")
                  .then(() => setFileManager(null))
                  .catch((e) => reportError(`恢复默认文件管理器失败：${e}`))
              }
            >
              恢复自动
            </Button>
          )}
        </Row>

        <Row label="字体">
          <Button variant="ghost" onClick={() => setShowFonts(true)}>字体设置…</Button>
        </Row>

        <Row label="ren 默认模板">
          <div className="w-48">
            <Select
              value={renGlobal || "__unset__"}
              options={[
                { value: "__unset__", label: "未设置（默认 noi）" },
                ...TEMPLATES.map((t) => ({ value: t, label: t })),
              ]}
              onChange={(v) => {
                const t = v === "__unset__" ? "" : v;
                setRenGlobalState(t);
                setRenGlobal(t).catch((e) => reportError(`保存 ren 默认模板失败：${e}`));
              }}
            />
          </div>
        </Row>

        <Row label="主题">
          <Button variant="ghost" onClick={onToggleTheme}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? "切换浅色模式" : "切换深色模式"}
          </Button>
        </Row>

        {tuackPicker && (
          <PathPicker
            title="选择 tuack-ng 可执行文件"
            directory={false}
            onSelect={(p) => {
              setTuackPicker(false);
              onSetTuack(p).catch(() => {});
            }}
            onClose={() => setTuackPicker(false)}
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
                .catch((e) => reportError(`保存文件管理器设置失败：${e}`));
            }}
            onClose={() => setFmPicker(false)}
          />
        )}
        {showFonts && <FontSettingsModal onClose={() => setShowFonts(false)} />}
      </DialogContent>
    </Dialog>
  );
}
