"use client";

import React from "react";

type Severity = "critical" | "warning" | "info";

type Event = {
  time: string;
  date: string;
  description: string;
  code: string;
  severity: Severity;
};

interface Props {
  events: Event[];
  activeCount?: number;
}

/**
 * Dot cluster config — mirrors the filled/unfilled circle patterns
 * in the "My cases" card of the reference image.
 * Each row has 3 dot groups of 2 dots each (6 dots total).
 * Filled = blue (#2563EB), semi = light blue (#BFDBFE), empty = #E2E8F0
 */
const severityDots: Record<Severity, [string, string, string, string, string, string]> = {
  critical: ["#2563EB", "#2563EB", "#2563EB", "#2563EB", "#1e293b", "#1e293b"],
  warning: ["#2563EB", "#2563EB", "#BFDBFE", "#BFDBFE", "#E2E8F0", "#E2E8F0"],
  info: ["#2563EB", "#BFDBFE", "#E2E8F0", "#E2E8F0", "#E2E8F0", "#E2E8F0"],
};

const severityLabel: Record<Severity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

const severityLabelColor: Record<Severity, string> = {
  critical: "#2563EB",
  warning: "#f59e0b",
  info: "#64748b",
};

export default function EmergencyProtocolsList({ events, activeCount = 0 }: Props) {
  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        flex: 1,
      }}
    >
      {/* ── Column headers ── */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 4,
        paddingBottom: 4, borderBottom: "1px solid #f1f5f9",
      }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Case
        </span>
        <span style={{ fontSize: 9, fontWeight: 600, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Severity
        </span>
      </div>

      {/* ── Event rows ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {events.map((evt, i) => {
          const dots = severityDots[evt.severity];
          return (
            <div
              key={evt.code}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 0",
                borderBottom: i < events.length - 1 ? "1px solid #f8fafc" : "none",
              }}
            >
              {/* Left: count badge + description + meta */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Count / rank badge */}
                <div style={{ minWidth: 24 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#0f172a" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Small avatar circle */}
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#f1f5f9",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" fill="#94a3b8" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#94a3b8" />
                  </svg>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                    {evt.description}
                  </span>
                  <span style={{ fontSize: 8.5, color: "#94a3b8", fontWeight: 500 }}>
                    {evt.code} · {evt.time}
                  </span>
                </div>
              </div>

              {/* Right: dot cluster */}
              <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                {[0, 2, 4].map((start) => (
                  <div key={start} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {[dots[start], dots[start + 1]].map((color, j) => (
                      <span
                        key={j}
                        style={{
                          width: 7, height: 7,
                          borderRadius: "50%",
                          background: color,
                          display: "block",
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{
        marginTop: 8,
        paddingTop: 6,
        borderTop: "1px solid #f1f5f9",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 500 }}>
          {activeCount} escalated · {events.length} total
        </span>
        <button style={{
          fontSize: 9, fontWeight: 700,
          color: "#2563EB", background: "#eff6ff",
          border: "none", borderRadius: 99,
          padding: "2px 8px", cursor: "pointer",
        }}>
          View all
        </button>
      </div>
    </div>
  );
}