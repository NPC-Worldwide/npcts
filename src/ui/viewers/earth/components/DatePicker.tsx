import React from "react";
import { CalendarDays } from "lucide-react";
import { MODIS_TERRA_START, getLatestTrueColorImagery } from "../lib/dates.js";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export function DatePicker({ value, onChange }: DatePickerProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="imagery-date" className="inline-flex items-center gap-2 text-xs text-gray-300">
        <CalendarDays className="h-3.5 w-3.5" />
        Date
      </label>
      <input
        id="imagery-date"
        type="date"
        min={MODIS_TERRA_START}
        max={getLatestTrueColorImagery().date}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  );
}
