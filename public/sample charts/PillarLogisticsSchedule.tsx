"use client";

import React from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';

interface ScheduleItem {
  id: string;
  type: string;
  route: string;
  time: string;
  status: 'Confirmed' | 'Pending' | 'On Route';
}

interface PillarLogisticsScheduleProps {
  items: ScheduleItem[];
}

export default function PillarLogisticsSchedule({ items }: PillarLogisticsScheduleProps) {
  return (
    <div className="logistics-timeline flex flex-col gap-3 pl-4 relative mt-2 block-no-margin">
       {/* Vertical Line */}
       <div className="absolute left-0 top-[22px] bottom-[20px] border-l border-dashed border-slate-200"></div>

       {items.map((item, idx) => (
         <div key={item.id} className="srow relative group">
            {/* Timeline Dot */}
            <div className={`absolute -left-[1.35rem] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 ${
              item.status === 'Confirmed' ? 'bg-[#10b981]' :
              item.status === 'On Route' ? 'bg-[#3b82f6]' :
              'bg-[#f59e0b]'
            }`}></div>

            <div className="fx jb ac w-full p-2 bg-slate-50/50 rounded hover:bg-slate-50 transition-colors border-0">
               <div className="fxc">
                 <div className="fx ac g4 mb-1">
                   <span className="lbl m-0" style={{color:'#3b82f6'}}>{item.type}</span>
                   <span className="sub mt-0 uppercase tracking-widest text-[#94a3b8]">{item.time}</span>
                 </div>
                 <div className="title m-0 tracking-tight text-slate-800">{item.route}</div>
               </div>
               
               <div className="fx ac g4">
                 <span className={`bdg ${
                    item.status === 'Confirmed' ? 'up' :
                    item.status === 'On Route' ? 'neu' : 'neu'
                  }`}>
                    {item.status}
                 </span>
               </div>
            </div>
         </div>
       ))}
    </div>
  );
}
