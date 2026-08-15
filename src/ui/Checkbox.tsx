// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Checkbox as ShadcnCheckbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export default function Checkbox({ checked, onChange, label }: Props) {
  const box = <ShadcnCheckbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />;
  if (!label) {
    return box;
  }
  return (
    <Label className="flex cursor-pointer items-center gap-2 text-foreground">
      {box}
      {label}
    </Label>
  );
}
