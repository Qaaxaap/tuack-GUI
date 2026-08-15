// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}

export default function Select({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative mb-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded px-3 py-1.5 text-sm"
        style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
      >
        <span>{current?.label ?? ""}</span>
        <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
      </button>
      {open && (
        <div
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded"
          style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border)" }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
              style={{ color: o.value === value ? "var(--brand)" : "var(--text)" }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
