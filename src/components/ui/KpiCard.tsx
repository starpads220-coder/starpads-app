"use client";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: "green" | "amber" | "red" | "blue" | "orange" | "default";
}

const colorMap = {
  green: "border-l-performance-green",
  amber: "border-l-performance-amber",
  red: "border-l-performance-red",
  blue: "border-l-stock-blue",
  orange: "border-l-stock-orange",
  default: "border-l-gray-400",
};

export function KpiCard({ label, value, subtext, color = "default" }: KpiCardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${colorMap[color]} p-4`}
    >
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  );
}
