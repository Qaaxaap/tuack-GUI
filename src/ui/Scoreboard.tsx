// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";
import { readTextFile } from "../ipc";

interface Row {
  tester: string;
  testId: string;
  status: string;
  score: string;
  full: string;
  time: string;
  memory: string;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function col(header: string[], ...names: string[]): number {
  for (const n of names) {
    const i = header.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
}

function statusColor(s: string): string {
  if (s === "AC") return "#23d18b";
  if (s === "WA") return "#f14c4c";
  if (s === "TLE" || s === "MLE") return "#3b8eea";
  if (s === "RE") return "#d670d6";
  if (s === "CE" || s === "FE") return "#e5e510";
  if (s.startsWith("PC")) return "#e5e510";
  return "var(--text)";
}

function Table({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          {["测试者", "测试点", "状态", "得分", "时间", "空间"].map((h) => (
            <th key={h} className="p-1 text-left" style={{ color: "var(--text-muted)" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={i}
            style={{
              borderBottom: "1px solid var(--border)",
              color: r.status === "TOTAL" ? "var(--text)" : "var(--text-muted)",
              fontWeight: r.status === "TOTAL" ? 700 : undefined,
            }}
          >
            <td className="p-1">{r.tester}</td>
            <td className="p-1">{r.testId}</td>
            <td className="p-1" style={{ color: statusColor(r.status) }}>
              {r.status}
            </td>
            <td className="p-1">{r.full ? `${r.score} / ${r.full}` : r.score}</td>
            <td className="p-1">{r.time}</td>
            <td className="p-1">{r.memory}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className="p-2" style={{ color: "var(--text-muted)" }}>
              暂无结果
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function Scoreboard({ dir }: { dir: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [sampleRows, setSampleRows] = useState<Row[]>([]);

  useEffect(() => {
    async function loadCsv(path: string): Promise<Row[]> {
      try {
        const text = await readTextFile(path);
        const grid = parseCsv(text);
        if (grid.length < 2) return [];
        const h = grid[0];
        const c = {
          tester: col(h, "测试者"),
          id: col(h, "测试点 ID"),
          status: col(h, "状态"),
          score: col(h, "得分"),
          full: col(h, "满分", "最高分"),
          time: col(h, "时间"),
          mem: col(h, "空间"),
        };
        return grid
          .slice(1)
          .map((r) => ({
            tester: r[c.tester] ?? "",
            testId: r[c.id] ?? "",
            status: r[c.status] ?? "",
            score: r[c.score] ?? "",
            full: r[c.full] ?? "",
            time: r[c.time] ?? "",
            memory: r[c.mem] ?? "",
          }))
          .filter((r) => r.tester !== "");
      } catch {
        return [];
      }
    }
    loadCsv(`${dir}/result.csv`).then(setRows);
    loadCsv(`${dir}/result-sample.csv`).then(setSampleRows);
  }, [dir]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1 text-xs font-medium" style={{ color: "var(--text)" }}>
          正式数据（result.csv）
        </div>
        <div className="overflow-auto rounded border" style={{ borderColor: "var(--border)" }}>
          <Table rows={rows} />
        </div>
      </div>
      <div>
        <div className="mb-1 text-xs font-medium" style={{ color: "var(--text)" }}>
          样例（result-sample.csv）
        </div>
        <div className="overflow-auto rounded border" style={{ borderColor: "var(--border)" }}>
          <Table rows={sampleRows} />
        </div>
      </div>
    </div>
  );
}
