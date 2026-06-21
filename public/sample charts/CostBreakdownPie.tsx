"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
    { name: 'Transport', value: 400, pct: '29%', color: '#3b82f6' },
    { name: 'Park Fees', value: 300, pct: '21%', color: '#f43f5e' },
    { name: 'Lodging', value: 500, pct: '36%', color: '#7c3aed' },
    { name: 'Guides', value: 200, pct: '14%', color: '#10b981' },
];

const total = data.reduce((s, d) => s + d.value, 0);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div style={{
        background: '#fff', borderRadius: 10, padding: '8px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: 'none',
      }}>
        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{d.name}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>${d.value.toLocaleString()}</div>
      </div>
    );
  }
  return null;
};

const CostBreakdownPie = () => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', height: '100%', minHeight: 160 }}>
          {/* Donut with center label */}
          <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={58}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={12}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>
            {/* Center total */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)', textAlign: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                ${(total / 1000).toFixed(1)}k
              </div>
              <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>TOTAL</div>
            </div>
          </div>

          {/* Side legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {data.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: d.color, flexShrink: 0,
                }} />
                <span style={{ fontSize: 10, color: '#64748b', flex: 1, fontWeight: 600 }}>{d.name}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#0f172a' }}>{d.pct}</span>
              </div>
            ))}
          </div>
        </div>
    );
};

export default CostBreakdownPie;
