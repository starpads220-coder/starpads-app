"use client";

import { ChartCard } from "@/components/ui/ChartCard";
import type { HeatmapData } from "./types";

interface CalendarHeatmapProps {
  data: HeatmapData[];
  title: string;
  subtitle?: string;
  loading?: boolean;
  className?: string;
  badge?: { label: string; value: string | number; color?: string };
  years?: string[];
  activeYear?: string;
  onYearChange?: (year: string) => void;
}

function getIntensity(value: number, max: number): string {
  if (max === 0) return "bg-gray-100";
  const ratio = value / max;
  if (ratio <= 0.25) return "bg-violet-100";
  if (ratio <= 0.5) return "bg-violet-300";
  if (ratio <= 0.75) return "bg-violet-500";
  return "bg-violet-700";
}

export function CalendarHeatmap({
  data,
  title,
  subtitle,
  loading = false,
  className,
  badge,
  years,
  activeYear,
  onYearChange,
}: CalendarHeatmapProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      loading={loading}
      className={className}
      badge={badge}
      headerContent={
        years ? (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => onYearChange?.(year)}
                className={`px-2 py-1 text-xs font-medium rounded-md ${
                  activeYear === year ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-1">
        {data.map((d, i) => (
          <div
            key={d.date || i}
            className={`w-3 h-3 rounded-sm ${getIntensity(d.value, maxVal)}`}
            title={`${d.date}: ${d.value}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100" />
        <div className="w-3 h-3 rounded-sm bg-violet-100" />
        <div className="w-3 h-3 rounded-sm bg-violet-300" />
        <div className="w-3 h-3 rounded-sm bg-violet-500" />
        <div className="w-3 h-3 rounded-sm bg-violet-700" />
        <span>More</span>
      </div>
    </ChartCard>
  );
}
