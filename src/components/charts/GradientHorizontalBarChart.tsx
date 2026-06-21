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
import { defaultMargins, animationConfig, tickStyles, palette } from "./config";
import type { DataPoint } from "./types";

interface GradientHorizontalBarChartProps {
  data: DataPoint[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  gradientStart?: string;
  gradientEnd?: string;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
  labelWidth?: number;
}

export function GradientHorizontalBarChart({
  data,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  gradientStart = palette.pink,
  gradientEnd = palette.violet,
  showGrid = true,
  badge,
  labelWidth = 140,
}: GradientHorizontalBarChartProps) {
  const anim = animationConfig.bar;
  const gradientId = `grad-hbar-${title.replace(/\s+/g, "-")}`;

  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={defaultMargins(12, 24, 0, 0)}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={gradientStart} stopOpacity={0.8} />
              <stop offset="100%" stopColor={gradientEnd} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />}
          <XAxis type="number" tickFormatter={(v: number) => String(v)} axisLine={false} tickLine={false} tick={tickStyles.x} />
          <YAxis type="category" dataKey="label" width={labelWidth} axisLine={false} tickLine={false} tick={tickStyles.y} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(15,23,42,0.03)" }} />
          <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[0, 8, 8, 0]} maxBarSize={24} animationDuration={anim.duration} animationBegin={anim.begin} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
