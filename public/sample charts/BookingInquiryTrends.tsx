"use client";

import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendPoint {
  month: string;
  leads: number;
  itineraries: number;
  bookings: number;
}

interface BookingInquiryTrendsProps {
  data: TrendPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-slate-100 shadow-xl rounded-lg">
        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}}></div>
            <p className="text-[11px] font-bold text-slate-700 w-16">{entry.name}</p>
            <p className="text-[12px] font-black">{entry.value}</p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function BookingInquiryTrends({ data }: BookingInquiryTrendsProps) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{fontSize: 9, fontWeight: 800, fill: '#64748b'}}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 800, color: '#64748b' }} />
          <Bar dataKey="leads" name="Leads" fill="#e2e8f0" radius={[2, 2, 0, 0]} barSize={14} />
          <Bar dataKey="itineraries" name="Itineraries" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={14} />
          <Line type="monotone" name="Bookings" dataKey="bookings" stroke="#10b981" strokeWidth={2.5} dot={{ stroke: '#10b981', strokeWidth: 2, r: 3, fill: '#fff' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
