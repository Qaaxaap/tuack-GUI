// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import PathPicker from "./PathPicker";
import FontSettingsModal from "./FontSettingsModal";
import { getFileManager, saveFileManager } from "../ipc";
import type { AppTheme } from "../theme";

interface Props {
  binaryStatus: string;
  onSetTuack: (path: string) => Promise<void>;
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

export default function SettingsDialog({ binaryStatus, onSetTuack, theme, onToggleTheme, onClose }: Props) {
  const [fileManager, setFileManager] = useState<string | null>(null);
  const [fmPicker, setFmPicker] = useState(false);
  const [tuackPicker, setTuackPicker] = useState(false);
  const [showFonts, setShowFonts] = useState(false);

  useEffect(() => {
    getFileManager()
      .then((fm) => setFileManager(fm))
      .catch(() => {});
  }, []);

  return (
    <Dialog open onOpenChange={(o) => {
      if (!o) onClose();
    }}>
      <DialogContent className="w-96 rounded-lg p-4">
        <div className="mb-1 text-sm" style={{ color: "var(--text)" }}>设置</div>

        <Row label="tuack-ng" value={binaryStatus}>
          <Button variant="ghost" onClick={() => setTuackPicker(true)}>选择可执行文件…</Button>
        </Row>

        <Row label="文件管理器" value={fileManager ?? "自动检测"}>
          <Button variant="ghost" onClick={() => setFmPicker(true)}>设置…</Button>
          {fileManager && (
            <Button
              variant="ghost"
              onClick={() =>
                saveFileManager("")
                  .then(() => setFileManager(null))
                  .catch(() => {})
              }
            >
              恢复自动
            </Button>
          )}
        </Row>

        <Row label="字体">
          <Button variant="ghost" onClick={() => setShowFonts(true)}>字体设置…</Button>
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
                .catch(() => {});
            }}
            onClose={() => setFmPicker(false)}
          />
        )}
        {showFonts && <FontSettingsModal onClose={() => setShowFonts(false)} />}
      </DialogContent>
    </Dialog>
  );
}
