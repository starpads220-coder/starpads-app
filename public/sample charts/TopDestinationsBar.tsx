"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface TopDestinationsBarProps {
    itineraries: any[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-slate-100 shadow-xl rounded-lg">
        <p className="text-[10px] font-black uppercase text-slate-400">{payload[0].payload.name}</p>
        <p className="text-[14px] font-black text-slate-900">{payload[0].value} <span className="text-[10px] text-slate-400">TRIPS</span></p>
      </div>
    );
  }
  return null;
};

const TopDestinationsBar = ({ itineraries }: TopDestinationsBarProps) => {
    const data = React.useMemo(() => {
        if (!itineraries || itineraries.length === 0) return [];

        const counts: Record<string, number> = {};
        itineraries.forEach(it => {
            const loc = it.location || (it.fullData?.days?.[0]?.destination) || 'Unknown';
            counts[loc] = (counts[loc] || 0) + 1;
        });

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        
        return Object.entries(counts)
            .map(([name, trips]) => ({ name, trips }))
            .sort((a, b) => b.trips - a.trips)
            .slice(0, 5)
            .map((item, index) => ({
                ...item,
                color: colors[index % colors.length]
            }));
    }, [itineraries]);

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-full text-[10px] text-slate-400 font-bold">No data available</div>;
    }

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: -20, bottom: 0 }}
                >
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        width={120}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                    <Bar dataKey="trips" radius={[0, 4, 4, 0]} barSize={12}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TopDestinationsBar;
