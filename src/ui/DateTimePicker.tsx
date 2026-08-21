// Copyright (C) 2025-2026 Tuack-GUI Develop Team.
// SPDX-License-Identifier: AGPL-3.0-or-later

// 开始/结束时间选择器：shadcn Calendar（日历弹窗选日期）+ 时/分/秒下拉。
// 值格式与 tuack 的 `start time` / `end time` 一致：[年,月,日,时,分,秒]（月从 1 起）。

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "../components/ui/button";
import { Calendar } from "../components/ui/calendar";
import { Input } from "../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";

interface Props {
  value: number[] | null | undefined;
  onChange: (v: number[] | null) => void;
}

function toDate(v: number[] | null | undefined): Date | undefined {
  if (!v || v.length < 6) return undefined;
  return new Date(v[0], (v[1] ?? 1) - 1, v[2] ?? 1, v[3] ?? 0, v[4] ?? 0, v[5] ?? 0);
}

function fromDate(d: Date): number[] {
  return [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  ];
}

export default function DateTimePicker({ value, onChange }: Props) {
  const date = toDate(value);
  const [open, setOpen] = useState(false);

  const handleTime = (t: string) => {
    const m = t.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (!m) return;
    const base = date ?? new Date();
    const d = new Date(base);
    d.setHours(Number(m[1]), Number(m[2]), Number(m[3] ?? 0));
    onChange(fromDate(d));
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-40 justify-start gap-2 px-2.5 text-xs font-normal"
          >
            <CalendarIcon className="size-3.5 shrink-0" />
            {date ? (
              format(date, "yyyy-MM-dd")
            ) : (
              <span className="text-muted-foreground">选择日期</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            onSelect={(d) => {
              if (d) {
                const nd = new Date(d);
                nd.setHours(date?.getHours() ?? 0, date?.getMinutes() ?? 0, date?.getSeconds() ?? 0);
                onChange(fromDate(nd));
              }
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <Input
        type="time"
        step="1"
        value={date ? format(date, "HH:mm:ss") : ""}
        placeholder="--:--:--"
        onChange={(e) => handleTime(e.target.value)}
        className="w-32 appearance-none bg-background text-xs [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
      />
    </div>
  );
}
