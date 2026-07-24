"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { Calendar } from "@/src/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";

function parseDateValue(value?: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Earliest selectable year (inclusive). Defaults to 1800. */
  fromYear?: number;
  /** Latest selectable date. Defaults to today. */
  toDate?: Date;
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  fromYear = 1800,
  toDate = new Date(),
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDateValue(value);
  const fromDate = new Date(fromYear, 0, 1);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {selected ? format(selected, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected ?? toDate}
          startMonth={fromDate}
          endMonth={toDate}
          disabled={{ after: toDate }}
          onSelect={(date) => {
            onChange(date ? toDateValue(date) : "");
            setOpen(false);
          }}
        />
        {value ? (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear date
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
