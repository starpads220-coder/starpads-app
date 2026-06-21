"use client";

import { palette } from "./config";

interface GaugeChartProps {
  value: number;
  max?: number;
  label?: string;
  subLabel?: string;
  color?: string;
  bgColor?: string;
  size?: number;
  variant?: "circular" | "semi-circle";
}

export function GaugeChart({
  value,
  max = 100,
  label = "Completed",
  subLabel,
  color = palette.violet,
  bgColor = "#f1f5f9",
  size = 160,
  variant = "circular",
}: GaugeChartProps) {
  const percentage = Math.min(Math.max(value / max, 0), 1);
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = variant === "semi-circle" ? Math.PI * radius : 2 * Math.PI * radius;
  const strokeDashoffset = circumference - percentage * circumference;
  const height = variant === "semi-circle" ? size * 0.6 : size;

  const arcPath = variant === "semi-circle"
    ? `M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`
    : "";

  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ width: size }}>
      <div style={{ position: "relative", width: size, height }}>
        <svg width={size} height={height} viewBox={`0 0 ${size} ${height}`}>
          <defs>
            <linearGradient id={`gauge-${color.replace("#", "")}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity={0.7} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>
          {variant === "circular" ? (
            <>
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
              <circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke={`url(#gauge-${color.replace("#", "")})`}
                strokeWidth={strokeWidth} strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
              />
            </>
          ) : (
            <>
              <path d={arcPath} fill="none" stroke={bgColor} strokeWidth={strokeWidth} strokeLinecap="round" />
              <path
                d={arcPath} fill="none" stroke={`url(#gauge-${color.replace("#", "")})`}
                strokeWidth={strokeWidth} strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
              />
            </>
          )}
        </svg>
        <div style={{
          position: "absolute", top: variant === "semi-circle" ? "auto" : 0, bottom: variant === "semi-circle" ? 0 : "auto",
          left: 0, right: 0, height: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: variant === "semi-circle" ? "flex-end" : "center",
          paddingBottom: variant === "semi-circle" ? 4 : 0,
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0f172a", lineHeight: 1, letterSpacing: "-0.03em" }}>
            {Math.round(percentage * 100)}%
          </span>
          {label && <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>}
          {subLabel && <span style={{ fontSize: "0.6rem", fontWeight: 600, color: "#c0c8d4", marginTop: 1 }}>{subLabel}</span>}
        </div>
      </div>
    </div>
  );
}
