"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartTooltip } from "./ChartTooltip";
import { palette, animationConfig } from "./config";

interface SingleDonutChartProps {
  value: number;
  total: number;
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  color?: string;
  bgColor?: string;
  badge?: { label: string; value: string | number; color?: string };
  centerLabel?: string;
  centerSubLabel?: string;
}

export function SingleDonutChart({
  value,
  total,
  title,
  subtitle,
  height = 280,
  loading = false,
  className,
  color = palette.violet,
  bgColor = "#f3f4f6",
  badge,
  centerLabel,
  centerSubLabel,
}: SingleDonutChartProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const data = [
    { name: "Used", value },
    { name: "Available", value: Math.max(0, total - value) },
  ];
  const anim = animationConfig.pie;

  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
              cornerRadius={6}
              animationDuration={anim.duration}
              animationBegin={anim.begin}
            >
              <Cell fill={color} />
              <Cell fill={bgColor} />
            </Pie>
            <Tooltip content={<ChartTooltip showPercent total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerLabel && <span className="text-2xl font-bold text-gray-900 leading-none">{centerLabel}</span>}
          {!centerLabel && <span className="text-3xl font-bold text-gray-900 leading-none">{pct}%</span>}
          {centerSubLabel && <span className="text-xs text-gray-500 mt-1">{centerSubLabel}</span>}
        </div>
      </div>
    </ChartCard>
  );
}
