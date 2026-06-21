"use client";

import React from "react";

interface FocusGoalGaugeProps {
  value: number; // current hours
  target: number; // target hours (e.g. 40)
  label?: string;
}

export default function FocusGoalGauge({ value, target, label = "Weekly Focus" }: FocusGoalGaugeProps) {
  const percent = Math.min(Math.round((value / target) * 100), 100);
  const size = 150;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(15,23,42,0.05)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#focusGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif"
        }}>
          <span style={{ fontSize: "2.4rem", fontWeight: 900, color: "#0f172a", lineHeight: 1, letterSpacing: "-0.05em" }}>
            {percent}%
          </span>
          <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginTop: 4, letterSpacing: "0.08em" }}>
            LEVEL
          </span>
        </div>
      </div>
      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
        Total <span style={{ fontWeight: 800, color: "#4f46e5" }}>{value}h</span> of {target}h goal
      </div>
    </div>
  );
}
