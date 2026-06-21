"use client";

import React, { useEffect, useState } from "react";

/**
 * Mission Progress Gauge
 * Styled after the "Activity Goal" card in the reference dashboard:
 * — Clean white card, rounded-2xl
 * — Donut-style ring gauge (not a needle speedometer)
 * — Bold blue progress fill (#2563EB), light grey track
 * — Inline metric rows with label + percentage bar (like Make a deal / Document / Tax)
 * — Central large % value inside the ring
 */

interface GoalRow {
  label: string;
  percent: number;
  color: string;
}

const GOALS: GoalRow[] = [
  { label: "Make a deal", percent: 70, color: "#2563EB" },
  { label: "Document", percent: 75, color: "#1e293b" },
  { label: "Tax", percent: 89, color: "#2563EB" },
];

// SVG donut helpers
const RADIUS = 54;
const STROKE = 11;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = 80; // viewBox centre

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function SafariMissionProgress() {
  const mainPercent = 75; // the big ring value
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, []);

  const dashOffset = animated
    ? CIRCUMFERENCE * (1 - mainPercent / 100)
    : CIRCUMFERENCE;

  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        flex: 1,
      }}
    >
      {/* ── Body: rows + ring ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

        {/* Goal rows */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {GOALS.map((g) => (
            <div key={g.label}>
              {/* label + percent */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{g.label}</span>
                <span style={{ fontSize: 11, color: "#0f172a", fontWeight: 700 }}>{g.percent}%</span>
              </div>
              {/* bar track */}
              <div style={{
                height: 4, borderRadius: 99,
                background: "#f1f5f9",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: animated ? `${g.percent}%` : "0%",
                  borderRadius: 99,
                  background: g.color,
                  transition: "width 1s cubic-bezier(.4,0,.2,1)",
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Donut ring */}
        <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
          <svg viewBox="0 0 160 160" width="110" height="110">
            {/* Track */}
            <circle
              cx={CENTER} cy={CENTER} r={RADIUS}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={STROKE}
            />
            {/* Progress */}
            <circle
              cx={CENTER} cy={CENTER} r={RADIUS}
              fill="none"
              stroke="#2563EB"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)" }}
            />
            {/* Inner ring accent */}
            <circle
              cx={CENTER} cy={CENTER} r={RADIUS - STROKE - 4}
              fill="none"
              stroke="#f8fafc"
              strokeWidth={4}
            />
          </svg>

          {/* Centre label */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontSize: 22, fontWeight: 800,
              color: "#0f172a", letterSpacing: "-0.03em",
              lineHeight: 1,
            }}>
              {mainPercent}%
            </span>
            <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, marginTop: 2, letterSpacing: "0.04em" }}>
              DONE
            </span>
          </div>
        </div>
      </div>

      {/* ── Footer stat ── */}
      <div style={{
        borderTop: "1px solid #f1f5f9",
        paddingTop: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: 11, color: "#64748b" }}>Received 24 of 33 missions</span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#2563EB",
          background: "#eff6ff", borderRadius: 99,
          padding: "2px 8px",
        }}>
          +8%
        </span>
      </div>
    </div>
  );
}