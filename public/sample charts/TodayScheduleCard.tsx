"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { TodayActivity } from "@/utils/aggregateWorkMetrics";

interface TodayScheduleCardProps {
  activities: TodayActivity[];
  date?: Date;
}

export default function TodayScheduleCard({ activities, date = new Date() }: TodayScheduleCardProps) {
  // Mini T tokens
  const T = {
    primary: "#4f46e5",
    success: "#10b981",
    text: "#0f172a",
    textMuted: "#64748b",
    textFaint: "#94a3b8",
    surfaceSub: "#f8fafc",
    border: "rgba(15,23,42,0.06)"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "1.6rem", fontWeight: 900, color: T.text, letterSpacing: "-0.04em" }}>
          {format(date, "d MMM")}
        </div>
        <div style={{ fontSize: "0.65rem", fontWeight: 800, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.08em", background: T.surfaceSub, padding: "4px 8px", borderRadius: "6px", border: `1px solid ${T.border}` }}>
          SCHEDULE
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto", paddingRight: "4px" }}>
        {activities.length === 0 ? (
          <div style={{ padding: "2rem 1rem", textAlign: "center", color: T.textFaint, fontSize: "0.78rem", fontWeight: 600, background: T.surfaceSub, borderRadius: "12px" }}>
            No mission logs for today.
          </div>
        ) : (
          activities.slice(0, 6).map((act, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "8px 10px", borderRadius: "10px",
              background: act.completed ? "rgba(16, 185, 129, 0.04)" : T.surfaceSub,
              border: `1px solid ${act.completed ? "rgba(16, 185, 129, 0.1)" : "transparent"}`,
              transition: "all 0.2s ease"
            }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: T.textFaint, minWidth: "42px", fontFamily: "'DM Mono', monospace" }}>
                {act.time}
              </span>
              <span style={{
                flex: 1, fontSize: "0.82rem", fontWeight: 700,
                color: act.completed ? T.text : T.textMuted,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>
                {act.title}
              </span>
              <div style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", background: act.completed ? T.success : "rgba(15,23,42,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={12} color={act.completed ? "#fff" : T.textFaint} strokeWidth={3} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
