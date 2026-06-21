"use client";

import { RadialBarChart as RechartsRadialBar, RadialBar, Legend, ResponsiveContainer, Tooltip } from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartTooltip } from "./ChartTooltip";
import { animationConfig, chartColors } from "./config";

interface RadialBarData {
  name: string;
  value: number;
  fill?: string;
}

interface RadialBarChartProps {
  data: RadialBarData[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  badge?: { label: string; value: string | number; color?: string };
  innerRadius?: string;
  outerRadius?: string;
}

export function RadialBarChart({
  data,
  title,
  subtitle,
  height = 280,
  loading = false,
  className,
  badge,
  innerRadius = "20%",
  outerRadius = "90%",
}: RadialBarChartProps) {
  const coloredData = data.map((d, i) => ({
    ...d,
    fill: d.fill || chartColors[i % chartColors.length],
  }));
  const anim = animationConfig.bar;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadialBar
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          barSize={12}
          data={coloredData}
          startAngle={90}
          endAngle={450}
        >
          <RadialBar background dataKey="value" cornerRadius={8} animationDuration={anim.duration} animationBegin={anim.begin} />
          <Tooltip content={<ChartTooltip formatter={(v) => String(v)} />} cursor={{ fill: "rgba(15,23,42,0.03)" }} />
          <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10, fontWeight: 700, color: "#64748b", paddingLeft: 10 }} />
        </RechartsRadialBar>
      </ResponsiveContainer>
    </ChartCard>
  );
}
