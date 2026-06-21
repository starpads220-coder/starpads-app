"use client";

import {
  LineChart,
  Line,
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

interface SmoothLineChartProps {
  data: LineData[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  color?: string;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
}

export function SmoothLineChart({
  data,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  color = palette.violet,
  showGrid = true,
  badge,
}: SmoothLineChartProps) {
  const anim = animationConfig.line;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={defaultMargins(12, 12, -12, 0)}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}
          <XAxis dataKey="label" tickMargin={10} axisLine={false} tickLine={false} tick={tickStyles.x} />
          <YAxis tickFormatter={formatCompact} axisLine={false} tickLine={false} tick={tickStyles.y} width={40} />
          <Tooltip content={<ChartTooltip formatter={formatCompact} />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "4 4" }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: "#fff", stroke: color, strokeWidth: 3 }}
            animationDuration={anim.duration}
            animationBegin={anim.begin}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
