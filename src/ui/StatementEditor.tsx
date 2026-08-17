// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useRef, useState } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { Save } from "lucide-react";
import { Button } from "../components/ui/button";
import Checkbox from "./Checkbox";
import { readTextFile, writeTextFile } from "../ipc";
import { reportError } from "../errors";
import type { AppTheme } from "../theme";

interface Props {
  /** 题目目录，编辑 <dir>/statement.md */
  dir: string;
  /** 保存后自动 ren（默认开） */
  autoRen: boolean;
  onAutoRenChange: (v: boolean) => void;
  onRender: () => void;
  running: boolean;
  theme: AppTheme;
}

/** 题面 Markdown 编辑器：CodeMirror + Ctrl/S 保存，可配置保存后自动渲染 */
export default function StatementEditor({
  dir,
  autoRen,
  onAutoRenChange,
  onRender,
  running,
  theme,
}: Props) {
  const path = `${dir}/statement.md`;
  /** CodeMirror 视图引用：保存时直接读编辑器里的真实文档，绕开受控值同步竞态 */
  const viewRef = useRef<EditorView | null>(null);
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  /** 保存时正有命令在跑：命令结束后补一次渲染 */
  const [pendingRen, setPendingRen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    readTextFile(path)
      .then((c) => {
        if (!alive) return;
        setContent(c);
        setMissing(false);
        setDirty(false);
        setLoaded(true);
      })
      .catch(() => {
        if (!alive) return;
        setContent("");
        setMissing(true);
        setDirty(false);
        setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [path]);

  async function save() {
    if (saving || !loaded) return;
    setSaving(true);
    try {
      // 直接读编辑器视图里的真实文档（屏幕上是什么就写什么），
      // 绕开受控 value 的同步竞态
      const text = viewRef.current?.state.doc.toString() ?? content;
      await writeTextFile(path, text);
      setContent(text);
      setDirty(false);
      // 有命令在跑（如上一次自动渲染）时不叠加启动 ren，排队等它结束再渲染
      if (autoRen) {
        if (running) {
          setPendingRen(true);
        } else {
          onRender();
        }
      }
    } catch (e) {
      reportError(`保存题面失败：${e}`);
    } finally {
      setSaving(false);
    }
  }

  // 命令结束后补一次排队中的渲染
  useEffect(() => {
    if (!running && pendingRen) {
      setPendingRen(false);
      onRender();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, pendingRen]);

  const status = saving ? "保存中…" : dirty ? "未保存" : "已保存";

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          save();
        }
      }}
    >
      <div
        className="flex h-9 shrink-0 items-center gap-3 px-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-xs" style={{ color: "var(--text)" }}>
          statement.md
        </span>
        <span
          className="text-xs"
          style={{ color: dirty ? "var(--accent)" : "var(--text-muted)" }}
        >
          {dirty ? "● " : ""}
          {status}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <Checkbox
            checked={autoRen}
            onChange={onAutoRenChange}
            label="保存后自动渲染"
          />
          <Button
            variant="default"
            size="sm"
            onClick={save}
            disabled={saving || !loaded}
          >
            <Save className="mr-1 h-3.5 w-3.5" />
            保存
          </Button>
        </div>
      </div>
      {missing && (
        <div
          className="shrink-0 px-3 py-1.5 text-xs"
          style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
        >
          statement.md 不存在，保存时将创建
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          key={dir}
          value={content}
          onCreateEditor={(view) => {
            viewRef.current = view;
          }}
          onChange={(v) => {
            setContent(v);
            setDirty(true);
          }}
          // 文件读完前禁编辑，避免加载回写覆盖刚输入的内容
          editable={loaded}
          // 题面是长段落文本：软折行，编辑器宽度锁死，不随行宽横向增长
          extensions={[markdown(), EditorView.lineWrapping]}
          theme={theme}
          height="100%"
          style={{ fontSize: 13, height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}
