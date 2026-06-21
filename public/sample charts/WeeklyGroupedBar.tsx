"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { DayDistribution } from "@/utils/aggregateWorkMetrics";

interface WeeklyGroupedBarProps {
  data: DayDistribution[];
}

export default function WeeklyGroupedBar({ data }: WeeklyGroupedBarProps) {
  // Use the same colors as our T tokens
  const colors = {
    signals: "#4f46e5",
    additional: "#10b981",
    text: "#0f172a",
    textMuted: "#64748b",
    textFaint: "#94a3b8",
    border: "rgba(15,23,42,0.08)"
  };

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          barGap={4}
          barSize={12}
        >
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: colors.textFaint, fontSize: 10, fontWeight: 700 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: colors.textFaint, fontSize: 9 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(15,23,42,0.03)", radius: 4 }}
            contentStyle={{
              borderRadius: "12px", 
              border: `1px solid ${colors.border}`,
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              fontSize: "11px",
              fontFamily: "'DM Sans', sans-serif"
            }}
            labelStyle={{ fontWeight: 800, color: colors.text }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            verticalAlign="top"
            align="right"
            wrapperStyle={{
              fontSize: "0.68rem",
              fontWeight: 700,
              paddingBottom: "15px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: colors.textMuted
            }}
          />
          <Bar
            dataKey="signals"
            name="Signals"
            fill={colors.signals}
            radius={[3, 3, 0, 0]}
            animationDuration={1500}
          />
          <Bar
            dataKey="additional"
            name="Additional"
            fill={colors.additional}
            radius={[3, 3, 0, 0]}
            animationDuration={1500}
            animationBegin={300}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
