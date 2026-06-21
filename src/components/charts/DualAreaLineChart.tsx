"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartTooltip } from "./ChartTooltip";
import { defaultMargins, formatCompact, animationConfig, tickStyles } from "./config";
import type { MultiLineData } from "./types";

interface DualAreaLineChartProps {
  data: MultiLineData[];
  series: { dataKey: string; name: string; color: string }[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
}

export function DualAreaLineChart({
  data,
  series,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  showLegend = true,
  showGrid = true,
  badge,
}: DualAreaLineChartProps) {
  const anim = animationConfig.area;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={defaultMargins(12, 12, -12, 0)}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.dataKey} id={`dual-area-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                <stop offset="60%" stopColor={s.color} stopOpacity={0.08} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}
          <XAxis dataKey="label" tickMargin={10} axisLine={false} tickLine={false} tick={tickStyles.x} />
          <YAxis tickFormatter={formatCompact} axisLine={false} tickLine={false} tick={tickStyles.y} width={45} />
          <Tooltip content={<ChartTooltip formatter={formatCompact} />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "4 4" }} />
          {showLegend && <Legend verticalAlign="top" height={28} iconType="circle" fontSize={10} wrapperStyle={{ fontWeight: 700, color: "#64748b" }} />}
          {series.map((s, i) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              stroke={s.color}
              strokeWidth={2.5}
              fill={`url(#dual-area-${i})`}
              dot={false}
              activeDot={{ r: 5, fill: "#fff", stroke: s.color, strokeWidth: 2.5 }}
              name={s.name}
              animationDuration={anim.duration}
              animationBegin={anim.begin}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
