"use client";

import {
  BarChart,
  Bar,
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
import type { MultiSeriesPoint, BarSeriesConfig } from "./types";

interface StackedColumnChartProps {
  data: MultiSeriesPoint[];
  series: BarSeriesConfig[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
}

export function StackedColumnChart({
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
}: StackedColumnChartProps) {
  const anim = animationConfig.bar;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={defaultMargins(12, 12, -12, 0)}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}
          <XAxis dataKey="label" tickMargin={10} axisLine={false} tickLine={false} tick={tickStyles.x} />
          <YAxis tickFormatter={formatCompact} axisLine={false} tickLine={false} tick={tickStyles.y} width={40} />
          <Tooltip content={<ChartTooltip formatter={formatCompact} />} cursor={{ fill: "rgba(15,23,42,0.03)" }} />
          {showLegend && <Legend verticalAlign="top" height={28} iconType="circle" fontSize={10} wrapperStyle={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }} />}
          {series.map((s, i) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name}
              fill={s.color}
              radius={[6, 6, 0, 0]}
              stackId={s.stackId || "stack"}
              maxBarSize={40}
              animationDuration={anim.duration}
              animationBegin={anim.begin + i * anim.stagger}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
