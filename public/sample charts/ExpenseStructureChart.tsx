"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ExpensePoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface ExpenseStructureChartProps {
  data: ExpensePoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#fff', borderRadius: 12, padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: 'none',
        minWidth: 130,
      }}>
        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: p.color, display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, flex: 1 }}>{p.name}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>${(p.value / 1000).toFixed(0)}k</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ExpenseStructureChart({ data }: ExpenseStructureChartProps) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          barGap={2}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
            dy={8}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 600, fill: '#c0c8d4' }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
          <Bar dataKey="revenue" name="Revenue" fill="#7c3aed" radius={[6, 6, 0, 0]} barSize={10} />
          <Bar dataKey="expenses" name="OpEx" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={10} />
          <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[6, 6, 0, 0]} barSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
