"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const data = [
    { month: 'Jan', revenue: 4000, projected: 3800 },
    { month: 'Feb', revenue: 3000, projected: 3200 },
    { month: 'Mar', revenue: 5000, projected: 4600 },
    { month: 'Apr', revenue: 4500, projected: 4800 },
    { month: 'May', revenue: 6000, projected: 5500 },
    { month: 'Jun', revenue: 5500, projected: 5800 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#fff',
        borderRadius: 14,
        padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        border: 'none',
        minWidth: 120,
      }}>
        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>${p.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const RevenueAreaChart = () => {
    return (
        <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="revGradPrimary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                            <stop offset="50%" stopColor="#7c3aed" stopOpacity={0.1} />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="revGradSecondary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                        <filter id="lineGlow">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComponentTransfer in="blur" result="glow">
                                <feFuncA type="linear" slope="0.4" />
                            </feComponentTransfer>
                            <feMerge>
                                <feMergeNode in="glow" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                        dy={8}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: '#c0c8d4', fontWeight: 600 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        dx={-5}
                        width={40}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area
                        type="monotone"
                        dataKey="projected"
                        stroke="#0ea5e9"
                        fillOpacity={1}
                        fill="url(#revGradSecondary)"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                        activeDot={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#7c3aed"
                        fillOpacity={1}
                        fill="url(#revGradPrimary)"
                        strokeWidth={2.5}
                        activeDot={{ r: 5, fill: '#fff', stroke: '#7c3aed', strokeWidth: 2.5 }}
                        style={{ filter: 'url(#lineGlow)' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default RevenueAreaChart;
