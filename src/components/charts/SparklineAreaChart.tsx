"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartTooltip } from "./ChartTooltip";
import { palette, formatCompact } from "./config";
import type { SparklineData } from "./types";

interface SparklineAreaChartProps {
  data: SparklineData[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  color?: string;
  badge?: { label: string; value: string | number; color?: string };
}

export function SparklineAreaChart({
  data,
  title,
  subtitle,
  height = 100,
  loading = false,
  className,
  color = palette.violet,
  badge,
}: SparklineAreaChartProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sparkline-${title.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip content={<ChartTooltip formatter={formatCompact} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#sparkline-${title.replace(/\s+/g, "-")})`}
            dot={false}
            activeDot={{ r: 4, fill: "#fff", stroke: color, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
