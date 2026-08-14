// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Check } from "lucide-react";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export default function Checkbox({ checked, onChange, label }: Props) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
      <input
        type="checkbox"
        className="hidden"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className="flex h-4 w-4 items-center justify-center rounded border transition-colors"
        style={{
          backgroundColor: checked ? "var(--accent)" : "transparent",
          borderColor: checked ? "var(--accent)" : "var(--border)",
        }}
      >
        {checked && <Check size={12} strokeWidth={3} style={{ color: "#ffffff" }} />}
      </span>
      {label}
    </label>
  );
}
