"use client";

import React from "react";
import type { PerformerEntry } from "@/utils/aggregateWorkMetrics";

interface TopPerformersTableProps {
  performers: PerformerEntry[];
}

export default function TopPerformersTable({ performers }: TopPerformersTableProps) {
  // Use T constants
  const T = {
    primary: "#4f46e5",
    surfaceSub: "#f8fafc",
    text: "#0f172a",
    textMuted: "#64748b",
    textFaint: "#94a3b8",
    success: "#10b981",
    danger: "#ef4444",
    border: "rgba(15,23,42,0.06)"
  };

  if (performers.length === 0) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: T.textFaint, fontSize: "0.82rem", fontWeight: 600, background: T.surfaceSub, borderRadius: "16px", border: `1.5px dashed ${T.border}` }}>
        No performance data recorded for this cycle.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Column headers */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 50px 60px",
        padding: "0 12px", fontSize: "0.62rem", fontWeight: 800,
        color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.08em",
        marginBottom: "4px"
      }}>
        <span>Team Member</span>
        <span style={{ textAlign: "right" }}>Growth</span>
        <span style={{ textAlign: "right" }}>Tasks</span>
      </div>

      {performers.map((p, i) => (
        <div key={p.uid} style={{
          display: "grid", gridTemplateColumns: "1fr 50px 60px",
          alignItems: "center", padding: "12px",
          background: i === 0 ? "rgba(79, 70, 229, 0.04)" : T.surfaceSub,
          borderRadius: "14px",
          border: `1px solid ${i === 0 ? "rgba(79, 70, 229, 0.1)" : T.border}`,
          transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          cursor: "default"
        }}>
          {/* Employee info */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "12px",
              background: i === 0 ? T.primary : i === 1 ? "#1e293b" : "#e2e8f0",
              color: i < 2 ? "#fff" : "#64748b",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: "0.95rem", flexShrink: 0,
              boxShadow: i === 0 ? "0 4px 12px rgba(79, 70, 229, 0.25)" : "none"
            }}>
              {p.avatarInitial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 800, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
              <div style={{ fontSize: "0.7rem", fontWeight: 600, color: T.textMuted }}>{p.role}</div>
            </div>
          </div>

          {/* Delta */}
          <div style={{
            fontSize: "0.75rem", fontWeight: 800, textAlign: "right",
            color: p.deltaPercent >= 0 ? T.success : T.danger,
          }}>
            {p.deltaPercent >= 0 ? "+" : ""}{p.deltaPercent}%
          </div>

          {/* Tasks */}
          <div style={{ fontSize: "1.05rem", fontWeight: 900, color: T.text, textAlign: "right", fontFamily: "'DM Mono', monospace" }}>
            {p.completedTasks}
          </div>
        </div>
      ))}
    </div>
  );
}
