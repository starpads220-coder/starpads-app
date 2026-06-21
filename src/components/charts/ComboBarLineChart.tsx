"use client";

import {
  BarChart,
  Bar,
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
import { defaultMargins, formatCompact, animationConfig, tickStyles, palette } from "./config";
import type { MultiSeriesPoint } from "./types";

interface ComboBarLineChartProps {
  data: MultiSeriesPoint[];
  barKey: string;
  barName: string;
  barColor?: string;
  lineKey: string;
  lineName: string;
  lineColor?: string;
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
}

export function ComboBarLineChart({
  data,
  barKey,
  barName,
  barColor = palette.pink,
  lineKey,
  lineName,
  lineColor = palette.violet,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  showLegend = true,
  showGrid = true,
  badge,
}: ComboBarLineChartProps) {
  const anim = animationConfig.bar;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={defaultMargins(12, 12, -12, 0)}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}
          <XAxis dataKey="label" tickMargin={10} axisLine={false} tickLine={false} tick={tickStyles.x} />
          <YAxis yAxisId="left" tickFormatter={formatCompact} axisLine={false} tickLine={false} tick={tickStyles.y} width={40} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={formatCompact} axisLine={false} tickLine={false} tick={tickStyles.y} width={40} />
          <Tooltip content={<ChartTooltip formatter={formatCompact} />} cursor={{ fill: "rgba(15,23,42,0.03)" }} />
          {showLegend && <Legend verticalAlign="top" height={28} iconType="circle" fontSize={10} wrapperStyle={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }} />}
          <Bar yAxisId="left" dataKey={barKey} name={barName} fill={barColor} radius={[6, 6, 0, 0]} maxBarSize={32} animationDuration={anim.duration} animationBegin={anim.begin} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey={lineKey}
            name={lineName}
            stroke={lineColor}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: "#fff", stroke: lineColor, strokeWidth: 3 }}
            animationDuration={anim.duration}
            animationBegin={anim.begin}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
