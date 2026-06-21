"use client";

import React from "react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { DayDistribution } from "@/utils/aggregateWorkMetrics";

interface DailyProductivityMiniProps {
  data: DayDistribution[];
}

export default function DailyProductivityMini({ data }: DailyProductivityMiniProps) {
  // Use T primary/muted values
  const T = {
    primary: "#4f46e5",
    muted: "rgba(15,23,42,0.08)",
    text: "#0f172a",
    textFaint: "#94a3b8"
  };

  const todayIdx = new Date().getDay();
  // Mon=1 ... Sun=0
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  const chartData = data.map(d => ({
    name: d.name,
    value: d.focusHours,
    isToday: dayMap[d.name] === todayIdx,
  }));

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} barSize={10}>
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: T.textFaint, fontSize: 8, fontWeight: 800 }}
            dy={4}
          />
          <Tooltip
            cursor={false}
            contentStyle={{
              borderRadius: "10px", 
              border: "1px solid rgba(0,0,0,0.05)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              fontSize: "10px", 
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif"
            }}
            formatter={(value: number | undefined) => [`${value ?? 0}h`, "Focus"]}
          />
          <Bar dataKey="value" radius={[3, 3, 3, 3]} animationDuration={1000}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isToday ? T.primary : T.muted}
                style={{ transition: "all 0.3s" }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
