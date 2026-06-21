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
import { defaultMargins, formatCompact, animationConfig, tickStyles, palette } from "./config";
import type { MultiLineData } from "./types";

interface WorldPopulationAreaChartProps {
  data: MultiLineData[];
  series: { dataKey: string; name: string; color: string }[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
  tabs?: { label: string; active: boolean; onClick: () => void }[];
}

export function WorldPopulationAreaChart({
  data,
  series,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  showGrid = true,
  badge,
  tabs,
}: WorldPopulationAreaChartProps) {
  const anim = animationConfig.area;
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      loading={loading}
      className={className}
      badge={badge}
      headerContent={
        tabs ? (
          <div className="flex gap-1 bg-white/20 rounded-lg p-0.5">
            {tabs.map((t) => (
              <button
                key={t.label}
                onClick={t.onClick}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  t.active ? "bg-white/30 text-white" : "text-white/70 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : undefined
      }
      variant="colored"
      accentColor={palette.violet}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={defaultMargins(12, 12, -12, 0)}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.dataKey} id={`world-pop-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />}
          <XAxis dataKey="label" tickMargin={10} axisLine={false} tickLine={false} tick={tickStyles.x} />
          <YAxis tickFormatter={formatCompact} axisLine={false} tickLine={false} tick={tickStyles.y} width={45} />
          <Tooltip content={<ChartTooltip formatter={formatCompact} />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "4 4" }} />
          {series.map((s, i) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              stroke={s.color}
              strokeWidth={2.5}
              fill={`url(#world-pop-${i})`}
              dot={false}
              activeDot={{ r: 5, fill: "#fff", stroke: s.color, strokeWidth: 2.5 }}
              name={s.name}
              animationDuration={anim.duration}
              animationBegin={anim.begin}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
