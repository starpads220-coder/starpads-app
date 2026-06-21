"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ZAxis,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { defaultMargins, chartColors, animationConfig, tickStyles } from "./config";

interface BubbleDataPoint {
  label: string;
  x: number;
  y: number;
  z: number;
}

interface BubbleChartProps {
  data: BubbleDataPoint[];
  title: string;
  subtitle?: string;
  height?: number;
  loading?: boolean;
  className?: string;
  xLabel?: string;
  yLabel?: string;
  showGrid?: boolean;
  badge?: { label: string; value: string | number; color?: string };
}

export function BubbleChart({
  data,
  title,
  subtitle,
  height = 300,
  loading = false,
  className,
  showGrid = true,
  badge,
}: BubbleChartProps) {
  const anim = animationConfig.line;
  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} className={className} badge={badge}>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={defaultMargins(12, 12, -12, 0)}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
          <XAxis dataKey="x" name="x" axisLine={false} tickLine={false} tick={tickStyles.x} />
          <YAxis dataKey="y" name="y" axisLine={false} tickLine={false} tick={tickStyles.y} width={40} />
          <ZAxis dataKey="z" range={[30, 200]} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as BubbleDataPoint;
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{d.label}</p>
                  <p className="text-sm text-gray-600 mt-1">X: {d.x} &middot; Y: {d.y} &middot; Z: {d.z}</p>
                </div>
              );
            }}
          />
          <Scatter data={data} fill={chartColors[0]} animationDuration={anim.duration} animationBegin={anim.begin} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
