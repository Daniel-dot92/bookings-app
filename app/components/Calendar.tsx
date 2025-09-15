// app/components/Calendar.tsx
"use client";

import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isBefore } from "date-fns";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

export default function Calendar({ value, onChange }: Props) {
  
  const [cursor, setCursor] = React.useState<Date>(startOfMonth(value));

  // навигация месец назад/напред
  const prev = () => setCursor(subMonths(cursor, 1));
  const next = () => setCursor(addMonths(cursor, 1));

  // изчисляваме видимата решетка (седмици)
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // неделя
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const weekDays = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

  return (
    <div className="rounded-2xl border shadow-sm p-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button className="px-3 py-1 rounded-full border hover:bg-gray-50" onClick={prev}>‹</button>
        <div className="font-semibold">
          {cursor.toLocaleString("en-US", { month: "long" })} {cursor.getFullYear()}
        </div>
        <button className="px-3 py-1 rounded-full border hover:bg-gray-50" onClick={next}>›</button>
      </div>

      {/* Weekday row */}
      <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
        {weekDays.map(w => <div key={w} className="py-1">{w}</div>)}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const disabled = isBefore(d, new Date(new Date().setHours(0,0,0,0)));
          const out = !isSameMonth(d, cursor);
          const selected = isSameDay(d, value);
          return (
            <button
              key={d.toISOString()}
              disabled={disabled}
              onClick={() => onChange(d)}
              className={[
                "h-10 rounded-full text-sm",
                "transition",
                disabled ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100",
                out ? "text-gray-400" : "",
                selected ? "bg-black text-white hover:bg-black" : "bg-white"
              ].join(" ")}
              title={d.toDateString()}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// тъй като сме в isolated file, добавяме import на React
import * as React from "react";
