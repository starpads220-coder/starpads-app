"use client";

interface StatusBadgeProps {
  value: number;
  threshold?: { amber: number; red: number };
}

export function StatusBadge({
  value,
  threshold = { amber: 100, red: 70 },
}: StatusBadgeProps) {
  let color: string;
  let label: string;

  if (value >= threshold.amber) {
    color = "bg-performance-green/10 text-performance-green border-performance-green/30";
    label = `${value}%`;
  } else if (value >= threshold.red) {
    color = "bg-performance-amber/10 text-performance-amber border-performance-amber/30";
    label = `${value}%`;
  } else {
    color = "bg-performance-red/10 text-performance-red border-performance-red/30";
    label = `${value}%`;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}
    >
      {label}
    </span>
  );
}
