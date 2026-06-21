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
import { defaultMargins, palette, chartColors, animationConfig, tickStyles } from "./config";
import type { DataPoint } from "./types";

interface HorizontalBarChartProps {
  data: DataPoint[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  barColor?: string;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
  labelWidth?: number;
}

export function HorizontalBarChart({
  data,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  barColor = palette.violet,
  showGrid = true,
  badge,
  labelWidth = 120,
}: HorizontalBarChartProps) {
  const anim = animationConfig.bar;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={defaultMargins(12, 24, 0, 0)} barSize={16}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />}
          <XAxis type="number" tickFormatter={(v: number) => String(v)} axisLine={false} tickLine={false} tick={tickStyles.y} />
          <YAxis type="category" dataKey="label" width={labelWidth} axisLine={false} tickLine={false} tick={tickStyles.x} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(15,23,42,0.03)" }} />
          <Bar dataKey="value" fill={barColor} radius={[0, 8, 8, 0]} animationDuration={anim.duration} animationBegin={anim.begin} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface MultiHorizontalBarChartProps {
  data: { label: string; values: { name: string; value: number }[] }[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
  labelWidth?: number;
}

export function MultiHorizontalBarChart({
  data,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  showGrid = true,
  badge,
  labelWidth = 120,
}: MultiHorizontalBarChartProps) {
  const flattened = data.map((d) => {
    const point: Record<string, string | number> = { label: d.label };
    d.values.forEach((v) => { point[v.name] = v.value; });
    return point;
  });

  const series = data[0]?.values.map((v, i) => ({
    dataKey: v.name,
    color: chartColors[i % chartColors.length],
  })) || [];

  const anim = animationConfig.bar;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={flattened} layout="vertical" margin={defaultMargins(12, 24, 0, 0)} barSize={14}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />}
          <XAxis type="number" tickFormatter={(v: number) => String(v)} axisLine={false} tickLine={false} tick={tickStyles.y} />
          <YAxis type="category" dataKey="label" width={labelWidth} axisLine={false} tickLine={false} tick={tickStyles.x} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(15,23,42,0.03)" }} />
          {series.map((s, i) => (
            <Bar key={s.dataKey} dataKey={s.dataKey} fill={s.color} radius={[0, 8, 8, 0]} animationDuration={anim.duration} animationBegin={anim.begin + i * anim.stagger} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
