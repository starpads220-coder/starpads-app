import React from 'react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface LiveLogisticsTimelineProps {
  data: Array<{
    route: string;
    onTime: number;
    delayed: number;
    critical: number;
  }>;
}

export default function LiveLogisticsTimeline({ data }: LiveLogisticsTimelineProps) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '180px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis 
            dataKey="route" 
            type="category" 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }}
            width={70}
          />
          <Tooltip 
            cursor={{ fill: 'transparent' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          />
          <Bar dataKey="onTime" stackId="a" fill="#10b981" radius={[4, 0, 0, 4]} barSize={16} />
          <Bar dataKey="delayed" stackId="a" fill="#f59e0b" />
          <Bar dataKey="critical" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
