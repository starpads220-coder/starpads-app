import React from "react";

interface StatPillProps {
  label: string;
  value: string | number;
  delta?: number;
  color?: "orange" | "blue" | "green" | "purple" | "amber" | "default";
}

const colorMap = {
  orange: "bg-orange-50 text-orange-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  purple: "bg-purple-50 text-purple-700",
  amber: "bg-amber-50 text-amber-700",
  default: "bg-gray-50 text-gray-700",
};

export function StatPill({ label, value, delta, color = "default" }: StatPillProps) {
  return (
    <div className={`${colorMap[color]} rounded-xl px-4 py-3 flex flex-col justify-center`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-lg font-bold leading-none">{value}</span>
        {delta !== undefined && (
          <span className={`text-xs font-medium mb-0.5 ${delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-gray-500"}`}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}
