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
import { defaultMargins, animationConfig, tickStyles, palette } from "./config";
import type { AreaRangeData } from "./types";

interface AreaRangeChartProps {
  data: AreaRangeData[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  color?: string;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
}

export function AreaRangeChart({
  data,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  color = palette.violet,
  showGrid = true,
  badge,
}: AreaRangeChartProps) {
  const anim = animationConfig.area;
  const rangeData = data.map((d) => ({
    label: d.label,
    min: d.min,
    max: d.max,
    mid: (d.min + d.max) / 2,
    line: d.line,
  }));

  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={rangeData} margin={defaultMargins(12, 12, -12, 0)}>
          <defs>
            <linearGradient id={`range-${title.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}
          <XAxis dataKey="label" tickMargin={10} axisLine={false} tickLine={false} tick={tickStyles.x} />
          <YAxis axisLine={false} tickLine={false} tick={tickStyles.y} width={40} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "4 4" }} />
          <Area type="monotone" dataKey="max" stroke="none" fill="none" />
          <Area type="monotone" dataKey="min" stroke="none" fill="none" />
          <Area
            type="monotone"
            dataKey="mid"
            stroke={color}
            strokeWidth={2}
            fill={`url(#range-${title.replace(/\s+/g, "-")})`}
            dot={false}
            activeDot={{ r: 5, fill: "#fff", stroke: color, strokeWidth: 2.5 }}
            animationDuration={anim.duration}
            animationBegin={anim.begin}
          />
          {data[0]?.line !== undefined && (
            <Area type="monotone" dataKey="line" stroke={palette.teal} strokeWidth={2} fill="none" dot={false} animationDuration={anim.duration} animationBegin={anim.begin} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
