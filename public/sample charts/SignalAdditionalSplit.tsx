"use client";

import React from "react";

interface SignalAdditionalProps {
  signalPercent: number;
  additionalPercent: number;
  signalCount: number;
  additionalCount: number;
}

export default function SignalAdditionalSplit({ 
  signalPercent, 
  additionalPercent, 
  signalCount, 
  additionalCount 
}: SignalAdditionalProps) {
  const colors = {
    amber: "#f59e0b",
    teal: "#14b8a6",
    text: "#0f172a",
    textFaint: "#94a3b8"
  };

  return (
    <div style={{ padding: "0.5rem 0", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ height: "45px", display: "flex", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.04)" }}>
        <div style={{ 
          width: `${signalPercent}%`, 
          background: colors.amber, 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center", 
          justifyContent: "center",
          transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{signalPercent}%</span>
        </div>
        <div style={{ 
          width: `${additionalPercent}%`, 
          background: colors.teal, 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center", 
          justifyContent: "center",
          transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
           <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{additionalPercent}%</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.62rem", fontWeight: 800, color: colors.textFaint, textTransform: "uppercase", letterSpacing: "0.05em" }}>Signals</span>
          <span style={{ fontSize: "0.9rem", fontWeight: 800, color: colors.text }}>{signalCount} Tasks</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "right" }}>
          <span style={{ fontSize: "0.62rem", fontWeight: 800, color: colors.textFaint, textTransform: "uppercase", letterSpacing: "0.05em" }}>Additional</span>
          <span style={{ fontSize: "0.9rem", fontWeight: 800, color: colors.text }}>{additionalCount} Tasks</span>
        </div>
      </div>
    </div>
  );
}
