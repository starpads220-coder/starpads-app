"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartTooltip } from "./ChartTooltip";
import { chartColors, animationConfig } from "./config";
import type { DonutSlice } from "./types";

interface DonutChartProps {
  data: DonutSlice[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  innerRadius?: number;
  outerRadius?: number;
  centerLabel?: string;
  centerSubLabel?: string;
  showLegend?: boolean;
  badge?: { label: string; value: string | number; color?: string };
  formatValue?: (value: number) => string;
}

export function DonutChart({
  data,
  title,
  subtitle,
  height = 280,
  loading = false,
  className,
  innerRadius = 60,
  outerRadius = 90,
  centerLabel,
  centerSubLabel,
  showLegend = true,
  badge,
  formatValue,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const anim = animationConfig.pie;

  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.length > 0 ? data : [{ name: "No data", value: 1 }]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={4}
              strokeWidth={0}
              cornerRadius={6}
              animationDuration={anim.duration}
              animationBegin={anim.begin}
            >
              {(data.length > 0 ? data : [{ name: "No data", value: 1 }]).map((_, i) => (
                <Cell key={`cell-${i}`} fill={data.length > 0 ? data[i]?.color || chartColors[i % chartColors.length] : "#e5e7eb"} />
              ))}
            </Pie>
            {showLegend && <Legend verticalAlign="bottom" height={24} iconType="circle" fontSize={10} wrapperStyle={{ fontWeight: 700, color: "#64748b" }} />}
            <Tooltip
              content={
                <ChartTooltip
                  formatter={formatValue}
                  showPercent
                  total={total}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerSubLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerLabel && <span className="text-2xl font-bold text-gray-900 leading-none">{centerLabel}</span>}
            {centerSubLabel && <span className="text-xs text-gray-500 mt-1">{centerSubLabel}</span>}
          </div>
        )}
      </div>
      {data.length > 0 && (
        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(data.length, 4)}, 1fr)` }}>
          {data.map((item, i) => {
            const share = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={item.name} className="bg-gray-50 rounded-lg border border-gray-100 px-3 py-2 text-center">
                <div
                  className="mx-auto mb-2 h-2.5 w-10 rounded-full"
                  style={{ backgroundColor: item.color || chartColors[i % chartColors.length] }}
                />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{item.name}</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{formatValue ? formatValue(item.value) : item.value.toLocaleString()}</p>
                <p className="text-[10px] text-gray-400">{share.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}
