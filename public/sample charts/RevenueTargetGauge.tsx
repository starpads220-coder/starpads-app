"use client";

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface RevenueTargetGaugeProps {
  current: number;
  target: number;
}

export default function RevenueTargetGauge({ current, target }: RevenueTargetGaugeProps) {
  const percent = Math.min(Math.round((current / target) * 100), 100);
  const remaining = 100 - percent;
  
  /* Three-segment gauge for a richer visual: achieved | buffer | remaining */
  const gaugeData = [
    { name: 'Achieved', value: percent * 0.85 },
    { name: 'Buffer', value: percent * 0.15 },
    { name: 'Gap', value: remaining },
  ];
  
  const COLORS = ['#7c3aed', '#a78bfa', '#f1f5f9'];
  
  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full" style={{ height: 100 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <filter id="gaugeGlow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComponentTransfer in="blur" result="glow">
                  <feFuncA type="linear" slope="0.3" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius={52}
              outerRadius={68}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              cornerRadius={8}
            >
              {gaugeData.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} style={i === 0 ? { filter: 'url(#gaugeGlow)' } : {}} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 4, textAlign: 'center' }}>
          <div className="text-[28px] font-black text-slate-900 tracking-tighter leading-none">{percent}%</div>
          <div className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">of Target</div>
        </div>
      </div>
      
      {/* Compact legend row */}
      <div className="flex items-center gap-4 mt-2 justify-center">
        <span className="flex items-center gap-1" style={{ fontSize: 9, color: '#64748b' }}>
          <span style={{ width: 6, height: 6, borderRadius: 2, background: '#7c3aed', display: 'inline-block' }} />
          Booked ${(current / 1000).toFixed(0)}k
        </span>
        <span className="flex items-center gap-1" style={{ fontSize: 9, color: '#64748b' }}>
          <span style={{ width: 6, height: 6, borderRadius: 2, background: '#f1f5f9', display: 'inline-block' }} />
          Target ${(target / 1000).toFixed(0)}k
        </span>
      </div>
    </div>
  );
}
