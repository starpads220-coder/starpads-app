"use client";

import type { ReactNode } from "react";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string | number;
  formatter?: (value: number, name?: string) => string;
  children?: ReactNode;
  showPercent?: boolean;
  total?: number;
}

export function ChartTooltip({ active, payload, label, formatter, showPercent, total }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-xl" style={{ minWidth: 130 }}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{String(label)}</p>
      <div className="space-y-1.5">
        {payload.map((entry, i) => {
          const pct = total && typeof entry.value === "number" ? ((entry.value / total) * 100).toFixed(1) : null;
          return (
            <div key={`${entry.name ?? entry.dataKey}-${i}`} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-semibold text-slate-600">{entry.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">
                  {formatter && typeof entry.value === "number" ? formatter(entry.value, entry.name) : entry.value}
                </span>
                {showPercent && pct && <span className="text-[10px] font-semibold text-slate-400">({pct}%)</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
