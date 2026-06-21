import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface WeeklyTimeDistributionProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export default function WeeklyTimeDistribution({ data }: WeeklyTimeDistributionProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 0, left: -25, bottom: 0 }}
          barSize={18}
        >
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            dy={5}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 9 }}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid rgba(15,23,42,0.08)', 
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)', 
              fontSize: '11px',
              fontFamily: "'DM Sans', sans-serif"
            }}
            labelStyle={{ fontWeight: 800, color: '#0f172a' }}
          />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} animationDuration={1200}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
