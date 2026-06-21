"use client";

import React, { useEffect, useState } from "react";

interface Slice {
  name: string;
  value: number;
  color?: string;
}

interface Props {
  data: Slice[];
}

/**
 * Fleet Status Gauge
 * Styled after the "Sessions by devices" card (bottom-right) from the reference:
 * — White card, rounded-2xl, subtle shadow
 * — Header: "Last 7 Days" label + arrow icon
 * — Left column: legend rows with dot + name + value + %
 * — Right: donut ring with large "Total" label + number in centre
 */
export default function FleetStatusGauge({ data }: Props) {
  const palette = ["#e2e8f0", "#2563eb", "#0f172a"];
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Donut SVG params — matches the compact ring in the reference
  const size = 118;
  const sw = 13;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;

  // Build segments
  const segments: { dash: number; offset: number; color: string; name: string }[] = [];
  let runningOffset = 0;
  data.forEach((slice, idx) => {
    const dash = (slice.value / total) * circ;
    segments.push({
      dash: animated ? dash : 0,
      offset: runningOffset,
      color: slice.color ?? palette[idx % palette.length],
      name: slice.name,
    });
    runningOffset += dash;
  });

  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: 1,
      }}
    >
      {/* ── Subheader ── */}
      <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.04em" }}>
        Last 7 Days
      </span>

      {/* ── Body ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

        {/* Legend rows */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {data.map((slice, idx) => {
            const pct = Math.round((slice.value / total) * 100);
            const color = slice.color ?? palette[idx % palette.length];
            return (
              <div key={slice.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  {/* Dot */}
                  <span style={{
                    width: 9, height: 9, borderRadius: "50%",
                    background: color, flexShrink: 0,
                    border: color === "#e2e8f0" ? "1.5px solid #cbd5e1" : "none",
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{slice.name}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                    {slice.value.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8", marginTop: 1 }}>
                    {pct}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Donut ring */}
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
          <svg
            width={size} height={size}
            style={{ transform: "rotate(-90deg)", overflow: "visible" }}
          >
            {/* Track */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />

            {/* Segments */}
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={sw}
                strokeLinecap="butt"
                strokeDasharray={`${seg.dash} ${circ}`}
                strokeDashoffset={-seg.offset}
                style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }}
              />
            ))}
          </svg>

          {/* Centre label */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em" }}>
              Total
            </span>
            <span style={{
              fontSize: 19, fontWeight: 900,
              color: "#0f172a", letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}>
              {total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}