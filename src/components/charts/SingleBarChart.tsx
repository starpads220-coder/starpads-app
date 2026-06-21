"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartTooltip } from "./ChartTooltip";
import { defaultMargins, formatCompact, animationConfig, tickStyles, palette } from "./config";
import type { DataPoint } from "./types";

interface SingleBarChartProps {
  data: DataPoint[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  color?: string;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
  selectionLabel?: string;
}

export function SingleBarChart({
  data,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  color = palette.green,
  showGrid = true,
  badge,
  selectionLabel,
}: SingleBarChartProps) {
  const anim = animationConfig.bar;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={defaultMargins(12, 12, -12, 0)}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}
          <XAxis dataKey="label" tickMargin={10} axisLine={false} tickLine={false} tick={tickStyles.x} />
          <YAxis tickFormatter={formatCompact} axisLine={false} tickLine={false} tick={tickStyles.y} width={40} />
          <Tooltip content={<ChartTooltip formatter={formatCompact} />} cursor={{ fill: "rgba(15,23,42,0.03)" }} />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={40} animationDuration={anim.duration} animationBegin={anim.begin} />
        </BarChart>
      </ResponsiveContainer>
      {selectionLabel && (
        <div className="mt-2 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
            {selectionLabel}
          </span>
        </div>
      )}
    </ChartCard>
  );
}
