"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface SatisfactionTier {
  name: string;
  value: number;
  color: string;
}

interface SatisfactionDonutProps {
  data: SatisfactionTier[];
}

export default function SatisfactionDonut({ data }: SatisfactionDonutProps) {
  return (
    <div className="donut-wrap relative h-40 mt-4 flex items-center justify-center">
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
         <span className="text-2xl font-black text-slate-900">{data.reduce((sum, item) => sum + item.value, 0)}</span>
         <span className="text-[10px] uppercase font-bold text-slate-400">TOTAL REVIEWS</span>
      </div>
      
      <style jsx>{`
        .donut-wrap { margin-top: -10px; }
      `}</style>
    </div>
  );
}
