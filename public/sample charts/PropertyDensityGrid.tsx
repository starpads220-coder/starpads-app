"use client";

import React from 'react';

interface DayData {
  day: number;
  intensity: number; // 0-4
}

interface MonthData {
  name: string;
  days: DayData[];
}

interface PropertyDensityGridProps {
  data: MonthData[];
}

export default function PropertyDensityGrid({ data }: PropertyDensityGridProps) {
  const getLevelColor = (level: number) => {
    const levels: Record<number, string> = {
      0: '#f8fafc',
      1: '#dcfce7',
      2: '#86efac',
      3: '#22c55e',
      4: '#15803d',
    };
    return levels[level] || levels[0];
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5 justify-center">
        {data.map((month) => (
          <div key={month.name} className="fxc gap-1">
            <span className="lbl text-center mb-0" style={{fontSize: 8}}>{month.name.substring(0, 1)}</span>
            <div className="grid grid-cols-2 gap-[2px]">
              {month.days.slice(0, 20).map((day, idx) => (
                <div 
                  key={idx} 
                  className="w-2.5 h-2.5 rounded-[2px] transition-all hover:scale-110 cursor-pointer" 
                  style={{ backgroundColor: getLevelColor(day.intensity) }}
                  title={`${month.name} Day ${day.day}: Intensity ${day.intensity}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="fx ac jc gap-3 mt-1">
         <span className="lbl m-0" style={{fontSize: 8, color: '#94a3b8'}}>Low</span>
         <div className="fx gap-[2px]">
            {[0,1,2,3,4].map(l => (
              <div key={l} className="w-2 h-2 rounded-[1.5px]" style={{ backgroundColor: getLevelColor(l) }} />
            ))}
         </div>
         <span className="lbl m-0" style={{fontSize: 8, color: '#94a3b8'}}>High</span>
      </div>
    </div>
  );
}
