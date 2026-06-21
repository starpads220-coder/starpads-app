"use client";

import React from 'react';

interface PaymentStatusProps {
  collected: string;
  outstanding: string;
  collectedPercent: number;
}

export default function PaymentStatus({ collected, outstanding, collectedPercent }: PaymentStatusProps) {
  const outstandingPercent = 100 - collectedPercent;
  
  return (
    <div className="flex flex-col mt-2 flex-1 justify-between h-full" style={{ minHeight: 140 }}>
      {/* VS-style split metric — cloned from reference's Mobile vs Desktop card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
          <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>💰 Collected</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: -1, lineHeight: 1 }}>{collectedPercent}%</span>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>{collected}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#cbd5e1', letterSpacing: 1 }}>VS</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
          <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>📋 Outstanding</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: -1, lineHeight: 1 }}>{outstandingPercent}%</span>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>{outstanding}</span>
        </div>
      </div>

      {/* Segmented progress bar — cloned from reference style */}
      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        <div style={{ display: 'flex', gap: 0, height: 8, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: `${collectedPercent}%`, 
            background: 'linear-gradient(90deg, #10b981, #34d399)',
            borderRadius: '4px 0 0 4px',
            boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
          }} />
          <div style={{
            width: `${outstandingPercent}%`,
            background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
            borderRadius: '0 4px 4px 0',
          }} />
        </div>
        
        {/* Legend dots */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#64748b', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            Buffered {collectedPercent}%
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#64748b', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
            Net 30/60
          </span>
        </div>
      </div>
    </div>
  );
}
