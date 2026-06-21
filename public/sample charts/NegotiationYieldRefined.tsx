"use client";

import React from 'react';

interface NegotiationYieldRefinedProps {
  label?: string;
  value?: string;
  percent?: number;
  subLabel?: string;
}

export default function NegotiationYieldRefined({
  label = "negotiation yield",
  value,
  percent = 78,
  subLabel = "yield performance index"
}: NegotiationYieldRefinedProps) {

  // Gauge configuration
  const totalSegments = 12;
  const activeSegments = Math.round((percent / 100) * totalSegments);

  // Dimensions refined for full visibility
  // Increased height to 180 to prevent any clipping of the bottom segments
  const viewBoxWidth = 240;
  const viewBoxHeight = 180;
  const cx = 120;
  const cy = 125; // Adjusted floor to give segments more room
  const radiusInner = 70;
  const radiusOuter = 100;

  // Colors from reference
  const activeColor = "#7c3aed";   // Purple
  const inactiveColor = "#f1f5f9"; // Ghost Grey

  return (
    <div className="w-full h-full flex flex-col p-4">
      {/* 1. Header Label (Added to match premium pattern) */}
      <div className="w-full flex justify-start mb-2">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{label}</span>
      </div>

      <div className="relative w-full flex-1 flex justify-center items-center">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-auto overflow-visible"
          style={{ fontFamily: 'var(--font-caveat), "Comic Sans MS", cursive' }}
        >
          {/* 1. The Segmented Arc */}
          {[...Array(totalSegments)].map((_, i) => {
            // Arc span from 185° to 355° for a perfect semi-circle with gap
            const startAngle = 185;
            const endAngle = 355;
            const angle = startAngle + (i * ((endAngle - startAngle) / (totalSegments - 1)));
            const radian = (angle * Math.PI) / 180;

            const x1 = cx + radiusInner * Math.cos(radian);
            const y1 = cy + radiusInner * Math.sin(radian);
            const x2 = cx + radiusOuter * Math.cos(radian);
            const y2 = cy + radiusOuter * Math.sin(radian);

            const isActive = i < activeSegments;

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isActive ? activeColor : inactiveColor}
                strokeWidth="18" // Bold "pill" look
                strokeLinecap="round"
                className="transition-all duration-500 ease-in-out"
              />
            );
          })}

          {/* 2. Percentage Counter / Value Display */}
          <text
            x={cx}
            y={cy - 15}
            textAnchor="middle"
            fill="#1e293b"
            style={{
              fontSize: '38px',
              fontWeight: '800',
              letterSpacing: '-0.05em'
            }}
          >
            {value || `${percent}%`}
          </text>

          {/* 3. Documentation Label - Positioned cleanly below the arc */}
          <text
            x={cx}
            y={cy + 45}
            textAnchor="middle"
            fill="#1e293b"
            style={{
              fontSize: '18px',
              fontWeight: '500',
              opacity: 0.9
            }}
          >
            {subLabel}
          </text>
        </svg>
      </div>
    </div>
  );
}