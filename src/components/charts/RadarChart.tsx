"use client";

import { RadarChart as RechartsRadar, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartTooltip } from "./ChartTooltip";
import { animationConfig, palette } from "./config";

interface RadarSeries {
  dataKey: string;
  name: string;
  color: string;
}

interface RadarChartProps {
  data: { subject: string; [key: string]: string | number }[];
  series: RadarSeries[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  badge?: { label: string; value: string | number; color?: string };
  maxValue?: number;
}

export function RadarChart({
  data,
  series,
  title,
  subtitle,
  height = 280,
  loading = false,
  className,
  badge,
  maxValue = 150,
}: RadarChartProps) {
  const anim = animationConfig.radar;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadar cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#f1f5f9" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 800, fill: palette.slate }} />
          <PolarRadiusAxis angle={30} domain={[0, maxValue]} tick={{ fontSize: 8, fill: "#c0c8d4" }} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
          {series.map((s) => (
            <Radar
              key={s.dataKey}
              name={s.name}
              dataKey={s.dataKey}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.12}
              strokeWidth={2}
              animationDuration={anim.duration}
              animationBegin={anim.begin}
            />
          ))}
        </RechartsRadar>
      </ResponsiveContainer>
    </ChartCard>
  );
}
