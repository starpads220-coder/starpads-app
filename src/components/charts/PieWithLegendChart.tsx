"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { ChartTooltip } from "./ChartTooltip";
import { chartColors, animationConfig } from "./config";
import type { DonutSlice } from "./types";

interface PieWithLegendChartProps {
  data: DonutSlice[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  innerRadius?: number;
  outerRadius?: number;
  badge?: { label: string; value: string | number; color?: string };
  formatValue?: (value: number) => string;
  centerLabel?: string;
  centerSubLabel?: string;
}

export function PieWithLegendChart({
  data,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  innerRadius = 0,
  outerRadius = 80,
  badge,
  formatValue,
  centerLabel,
  centerSubLabel,
}: PieWithLegendChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const anim = animationConfig.pie;

  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full items-center">
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
                  <Cell key={i} fill={data[i]?.color || chartColors[i % chartColors.length]} cursor="pointer" />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip formatter={formatValue} showPercent total={total} />} />
            </PieChart>
          </ResponsiveContainer>
          {(centerLabel || centerSubLabel) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {centerLabel && <span className="text-2xl font-bold text-gray-900 leading-none tracking-tight">{centerLabel}</span>}
              {centerSubLabel && <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{centerSubLabel}</span>}
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center gap-2">
          {data.map((item, i) => {
            const share = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={item.name} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || chartColors[i % chartColors.length] }} />
                  <span className="text-xs font-semibold text-slate-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900">
                    {formatValue ? formatValue(item.value) : item.value.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 ml-1.5">({share.toFixed(1)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}
