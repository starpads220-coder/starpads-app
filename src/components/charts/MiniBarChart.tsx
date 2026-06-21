"use client";

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartTooltip } from "./ChartTooltip";
import { chartColors, animationConfig, tickStyles } from "./config";
import type { DataPoint } from "./types";

interface MiniBarChartProps {
  data: DataPoint[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  barColors?: string[];
  badge?: { label: string; value: string | number; color?: string };
  headerContent?: React.ReactNode;
}

export function MiniBarChart({
  data,
  title,
  subtitle,
  height = 120,
  loading = false,
  className,
  barColors = chartColors,
  badge,
  headerContent,
}: MiniBarChartProps) {
  const anim = animationConfig.bar;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge} headerContent={headerContent}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={tickStyles.x} tickMargin={4} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(15,23,42,0.03)" }} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={16} animationDuration={anim.duration} animationBegin={anim.begin}>
            {data.map((_, i) => (
              <Cell key={i} fill={barColors[i % barColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
