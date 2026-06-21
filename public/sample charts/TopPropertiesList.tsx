"use client";

import React from 'react';
import { Star, TrendingUp } from 'lucide-react';

interface PropertyItem {
  name: string;
  bookings: number;
  rating: number;
  cost: string;
}

interface TopPropertiesListProps {
  properties: PropertyItem[];
}

export default function TopPropertiesList({ properties }: TopPropertiesListProps) {
  return (
    <div className="flex flex-col gap-2">
      {properties.map((p, i) => (
        <div key={i} className="srow2 bg-slate-50/50 rounded-lg border border-slate-100/50 px-2 py-1.5 flex items-center gap-3">
          <div className="w-6 h-6 bg-slate-800 text-white rounded flex items-center justify-center font-black text-[10px] flex-shrink-0">
            {i + 1}
          </div>
          <div className="fxc flex-1">
            <strong className="title m-0 tracking-tight">{p.name}</strong>
            <span className="lbl mt-0" style={{color: '#64748b'}}>Rate: {p.cost}</span>
          </div>
          <div className="fxc items-end gap-1">
             <div className="bdg neu py-0 px-1.5">
               <TrendingUp size={10} className="text-blue-500 mr-1" /> <span className="text-[10px] font-black">{p.bookings}</span>
             </div>
             <div className="bdg up py-0 px-1.5" style={{background: '#fffbeb', color: '#b45309'}}>
               <Star size={10} className="mr-1 text-orange-400" fill="currentColor" /> <span className="text-[10px] font-black">{p.rating}</span>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
}
