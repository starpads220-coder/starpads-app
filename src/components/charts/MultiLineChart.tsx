"use client";

import {
  LineChart,
  Line,
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

interface LineSeriesConfig {
  dataKey: string;
  name: string;
  color: string;
}

interface MultiLineChartProps {
  data: MultiLineData[];
  series: LineSeriesConfig[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
}

export function MultiLineChart({
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
}: MultiLineChartProps) {
  const anim = animationConfig.line;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={defaultMargins(12, 12, -12, 0)}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}
          <XAxis dataKey="label" tickMargin={10} axisLine={false} tickLine={false} tick={tickStyles.x} />
          <YAxis tickFormatter={formatCompact} axisLine={false} tickLine={false} tick={tickStyles.y} width={40} />
          <Tooltip content={<ChartTooltip formatter={formatCompact} />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "4 4" }} />
          {showLegend && <Legend verticalAlign="top" height={28} iconType="circle" fontSize={10} wrapperStyle={{ fontWeight: 700, color: "#64748b" }} />}
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              stroke={s.color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "#fff", stroke: s.color, strokeWidth: 2.5 }}
              name={s.name}
              animationDuration={anim.duration}
              animationBegin={anim.begin}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
