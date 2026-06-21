"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ProductivityPoint {
  week: string;
  volume: number;
}

interface ProductivityTrendAreaProps {
  data: ProductivityPoint[];
}

export default function ProductivityTrendArea({ data }: ProductivityTrendAreaProps) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 0, right: 0, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D97706" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#D97706" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="week" 
            axisLine={false} 
            tickLine={false} 
            tick={{fontSize: 9, fontWeight: 800, fill: '#64748b'}}
          />
          <YAxis hide />
          <Tooltip 
            cursor={{ stroke: '#f1f5f9', strokeWidth: 2, strokeDasharray: '4 4' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 11 }}
            labelStyle={{ fontWeight: 800, color: '#1a1c1e' }}
          />
          <Area 
            type="monotone" 
            dataKey="volume" 
            stroke="#D97706" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorVolume)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
