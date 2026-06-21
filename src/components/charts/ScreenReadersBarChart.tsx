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

interface ScreenReadersBarChartProps {
  data: DataPoint[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  color?: string;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
  labelWidth?: number;
}

export function ScreenReadersBarChart({
  data,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  color = palette.pink,
  showGrid = true,
  badge,
  labelWidth = 140,
}: ScreenReadersBarChartProps) {
  const anim = animationConfig.bar;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={defaultMargins(12, 12, 0, 0)}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />}
          <XAxis type="number" axisLine={false} tickLine={false} tick={tickStyles.x} />
          <YAxis type="category" dataKey="label" width={labelWidth} axisLine={false} tickLine={false} tick={tickStyles.y} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(15,23,42,0.03)" }} />
          <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} maxBarSize={20} animationDuration={anim.duration} animationBegin={anim.begin} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
