"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartTooltip } from "./ChartTooltip";
import { defaultMargins, formatCompact, animationConfig, tickStyles, palette } from "./config";
import type { LineData } from "./types";

interface TransactionValueChartProps {
  data: LineData[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  color?: string;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
  timeFilters?: { label: string; active: boolean; onClick: () => void }[];
}

export function TransactionValueChart({
  data,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  color = palette.violet,
  showGrid = true,
  badge,
  timeFilters,
}: TransactionValueChartProps) {
  const anim = animationConfig.area;
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      loading={loading}
      className={className}
      badge={badge}
      headerContent={
        timeFilters ? (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {timeFilters.map((f) => (
              <button
                key={f.label}
                onClick={f.onClick}
                className={`px-2 py-1 text-xs font-medium rounded-md ${
                  f.active ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={defaultMargins(12, 12, -12, 0)}>
          <defs>
            <linearGradient id={`txn-${title.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}
          <XAxis dataKey="label" tickMargin={10} axisLine={false} tickLine={false} tick={tickStyles.x} />
          <YAxis tickFormatter={formatCompact} axisLine={false} tickLine={false} tick={tickStyles.y} width={40} />
          <Tooltip content={<ChartTooltip formatter={formatCompact} />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "4 4" }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#txn-${title.replace(/\s+/g, "-")})`}
            dot={false}
            activeDot={{ r: 5, fill: "#fff", stroke: color, strokeWidth: 2.5 }}
            animationDuration={anim.duration}
            animationBegin={anim.begin}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
