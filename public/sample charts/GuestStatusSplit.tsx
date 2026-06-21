"use client";
import React from "react";

interface RegionalBreakdown {
  region: string;
  count: number;
  color: string;
}

interface GuestStatusSplitProps {
  fieldGuests: number;
  vehicleCount: number;
  baseGuests: number;
  regions: RegionalBreakdown[];
}

/**
 * Active Guests (Field) Breakdown
 * Styled after the "Avg. Energy Activity" card from the design reference.
 * — High-fidelity horizontal bars with curved endings.
 * — Regional breakdown (Serengeti, Mara, etc.)
 * — Clean metric header with guest and vehicle totals.
 * 
 * NOTE: Using Inline Styles as Tailwind is not configured in this project.
 */
export default function GuestStatusSplit({ fieldGuests, vehicleCount, baseGuests, regions }: GuestStatusSplitProps) {
  const totalTracked = fieldGuests + baseGuests;
  const maxRegionCount = Math.max(...regions.map(r => r.count), 1);

  return (
    <div style={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      fontFamily: "'DM Sans', sans-serif"
    }}>
      {/* ── Subtitle / Header info ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: "-1px", lineHeight: 1 }}>
            {totalTracked}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 4 }}>
            Active Guests Tracked
          </div>
        </div>
        <div style={{ 
          display: "flex", alignItems: "center", gap: 6, 
          background: "rgba(37, 99, 235, 0.08)", padding: "4px 10px", 
          borderRadius: 12, border: "1px solid rgba(37, 99, 235, 0.12)" 
        }}>
          <span style={{ 
            width: 7, height: 7, borderRadius: "50%", background: "#2563eb", 
            boxShadow: "0 0 8px rgba(37,99,235,0.4)" 
          }}></span>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#2563eb" }}>
            {vehicleCount} Assets
          </span>
        </div>
      </div>

      {/* ── Regional Horizontal Bars ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {regions.map((r, i) => {
          const width = (r.count / maxRegionCount) * 100;
          return (
            <div key={r.region} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  {r.region}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>
                  {r.count} <span style={{ color: "#cbd5e1" }}>PAX</span>
                </span>
              </div>
              <div style={{ 
                width: "100%", height: 10, background: "#f1f5f9", 
                borderRadius: 99, overflow: "hidden", position: "relative" 
              }}>
                <div style={{ 
                  height: "100%", width: `${width}%`, background: r.color, 
                  borderRadius: 99, transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: i === 0 ? `0 0 10px ${r.color}44` : "none"
                }}></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Legend footer ── */}
      <div style={{ 
        marginTop: 18, paddingTop: 12, borderTop: "1px solid #f1f5f9", 
        display: "flex", justifyContent: "space-between", alignItems: "center" 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#cbd5e1" }}></div>
          <span style={{ fontSize: 9.5, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>
            Base Station {baseGuests}
          </span>
        </div>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#e2e8f0", textTransform: "uppercase" }}>
          Grouped Analytics
        </span>
      </div>
    </div>
  );
}

