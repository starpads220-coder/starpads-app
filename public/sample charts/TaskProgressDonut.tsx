"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface TaskTier {
  name: string;
  value: number;
  color: string;
}

interface TaskProgressDonutProps {
  data: TaskTier[];
}

export default function TaskProgressDonut({ data }: TaskProgressDonutProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="flex flex-col items-center">
      <div className="h-40 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
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
        <div className="absolute inset-0 fxc ac jc pointer-events-none pb-2">
           <span className="num m-0" style={{lineHeight: 1}}>{total}</span>
           <span className="lbl m-0" style={{fontSize: 8}}>TOTAL</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5 mt-2">
         {data.map(d => (
            <div key={d.name} className="fx ac g4 bg-slate-50/80 px-1.5 py-0.5 rounded border border-slate-100/50">
               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }}></div>
               <span className="lbl m-0" style={{fontSize: 8, color: '#64748b'}}>{d.name}: {d.value}</span>
            </div>
         ))}
      </div>
    </div>
  );
}
