"use client";

import React from 'react';

interface RevenueKPIProps {
  label: string;
  value: string;
  trend: string;
  footer: string;
}

/* Sparkline bar data — simulates weekly progression */
const sparkBars = [38, 52, 45, 68, 55, 72, 60, 80, 58, 85, 64, 90];

export default function RevenueKPI({ label, value, trend, footer }: RevenueKPIProps) {
  const maxVal = Math.max(...sparkBars);
  const highlightIdx = sparkBars.length - 1;

  return (
    <div className="relative w-full h-full flex flex-col justify-between" style={{ minHeight: 160 }}>
      {/* Upper: metric */}
      <div className="relative z-10">
        <div className="lbl" style={{ margin: 0 }}>{label}</div>
        <div className="flex items-center gap-3 mt-1.5 mb-1">
          <span className="num" style={{ margin: 0, fontSize: 30 }}>{value}</span>
          <span className="bdg up">{trend}</span>
        </div>
      </div>

      {/* Sparkline bar chart — reference-style rounded micro bars */}
      <div className="flex items-end gap-[3px] mt-auto mb-2 relative z-10" style={{ height: 48 }}>
        {sparkBars.map((val, i) => {
          const h = (val / maxVal) * 44;
          const isActive = i === highlightIdx;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: h,
                borderRadius: 4,
                background: isActive
                  ? 'linear-gradient(to top, #7c3aed, #a78bfa)'
                  : 'linear-gradient(to top, #e2e8f0, #f1f5f9)',
                transition: 'height 0.4s ease',
                boxShadow: isActive ? '0 2px 8px rgba(124,58,237,0.25)' : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Footer label */}
      <div className="sub mt-1 pt-2 border-t border-slate-100 relative z-10 flex items-center gap-2">
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />
        {footer}
      </div>
    </div>
  );
}
