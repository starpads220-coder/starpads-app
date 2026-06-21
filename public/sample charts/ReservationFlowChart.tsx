"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
    { name: 'Inquiry', count: 45, color: '#3b82f6' },
    { name: 'Costing', count: 32, color: '#f59e0b' },
    { name: 'Reserved', count: 28, color: '#10b981' },
    { name: 'Active', count: 12, color: '#8b5cf6' },
];

const ReservationFlowChart = () => {
    return (
        <div style={{ width: '100%', height: '100%', minHeight: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 11 }}
                    />
                    <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={14}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ReservationFlowChart;
