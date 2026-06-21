"use client";

import React, { useEffect, useState } from "react";

interface Performance {
  onTime: number;
  delayed: number;
  critical: number;
}

interface Props {
  performance?: Performance;
}

/**
 * System Performance — styled after the "Page views" card in the reference.
 * — Large headline metric top-left
 * — Small delta badge (green pill)
 * — Grouped bar strip: alternating blue highlight bar + grey companion bar
 * — Month labels beneath each group
 * — Arrow icon top-right
 */
export default function SystemRadarChart({
  performance = { onTime: 88, delayed: 9, critical: 3 },
}: Props) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Each group: [highlightBar, greyBar] — mirrors the paired columns in Page views
  const groups = [
    { month: "Jan", a: 55, b: 38 },
    { month: "Feb", a: 70, b: 45 },
    { month: "Mar", a: 48, b: 60 },
    { month: "Apr", a: 80, b: 50 },
    { month: "May", a: performance.onTime, b: 42 },
    { month: "Jun", a: 62, b: 74 },
    { month: "Jul", a: 44, b: 55 },
    { month: "Aug", a: 76, b: 38 },
    { month: "Sep", a: 58, b: 65 },
    { month: "Oct", a: 85, b: 48 },
  ];

  const allVals = groups.flatMap((g) => [g.a, g.b]);
  const max = Math.max(...allVals);

  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        width: "100%",
        flex: 1,
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="#2563EB" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
            Logistics Performance
          </span>
        </div>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M2 7h10M7 2l5 5-5 5" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* ── Big metric + delta badge ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{
          fontSize: 26, fontWeight: 900, color: "#0f172a",
          letterSpacing: "-0.04em", lineHeight: 1,
        }}>
          94.2%
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#16a34a",
          background: "#dcfce7", borderRadius: 99,
          padding: "2px 8px", letterSpacing: "0.01em",
        }}>
          +12.4%
        </span>
      </div>

      {/* ── Grouped bar strip ── */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 6,
        height: 100,
      }}>
        {groups.map((g, i) => {
          const hPct = animated ? (g.a / max) * 100 : 0;
          const gPct = animated ? (g.b / max) * 100 : 0;
          const isAccent = g.a === Math.max(...groups.map((x) => x.a));
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 2.5,
                flex: 1,
                height: "100%",
              }}
            >
              {/* Bar A — blue accent or grey */}
              <div
                style={{
                  flex: 1,
                  borderRadius: "3px 3px 1.5px 1.5px",
                  height: `${Math.max(12, hPct)}%`,
                  background: isAccent ? "#2563EB" : "#f1f5f9",
                  transition: `height 0.8s cubic-bezier(.4,0,.2,1) ${i * 40}ms`,
                  minWidth: 4,
                }}
              />
              {/* Bar B — companion grey */}
              <div
                style={{
                  flex: 1,
                  borderRadius: "3px 3px 1.5px 1.5px",
                  height: `${Math.max(8, gPct)}%`,
                  background: "#e2e8f0",
                  transition: `height 0.8s cubic-bezier(.4,0,.2,1) ${i * 40 + 20}ms`,
                  minWidth: 4,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ── Month labels ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 8,
      }}>
        {groups.map((g, i) => (
          <span key={i} style={{
            flex: 1,
            textAlign: "center",
            fontSize: 9,
            fontWeight: 700,
            color: "#94a3b8",
            letterSpacing: "0.02em",
          }}>
            {g.month}
          </span>
        ))}
      </div>

      {/* ── Footer stats ── */}
      <div style={{
        marginTop: 12,
        paddingTop: 8,
        borderTop: "1px solid #f1f5f9",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563EB", display: "inline-block" }} />
            <span style={{ fontSize: 9.5, color: "#64748b", fontWeight: 600 }}>On-time {performance.onTime}%</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e2e8f0", display: "inline-block" }} />
            <span style={{ fontSize: 9.5, color: "#64748b", fontWeight: 600 }}>Delayed {performance.delayed}%</span>
          </div>
        </div>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#ef4444" }}>
          {performance.critical}% critical
        </span>
      </div>
    </div>
  );
}