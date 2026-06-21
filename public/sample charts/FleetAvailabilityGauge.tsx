"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface FleetStatus {
  name: string;
  value: number;
  color: string;
}

interface FleetAvailabilityGaugeProps {
  data: FleetStatus[];
}

export default function FleetAvailabilityGauge({ data }: FleetAvailabilityGaugeProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="fleet-gauge relative h-40 mt-4 flex items-center justify-center">
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
         <span className="text-xl font-black text-slate-900">{total}</span>
         <span className="text-[9px] uppercase font-bold text-slate-400">FLEET SIZE</span>
      </div>

      <div className="absolute bottom-[-15px] flex gap-4">
         {data.map(d => (
            <div key={d.name} className="flex items-center gap-1">
               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }}></div>
               <span className="text-[8px] font-black text-slate-400 uppercase">{d.name}</span>
            </div>
         ))}
      </div>
      
      <style jsx>{`
        .fleet-gauge { margin-top: -10px; }
      `}</style>
    </div>
  );
}
