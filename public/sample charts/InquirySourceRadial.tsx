"use client";

import React from 'react';
import { RadialBarChart, RadialBar, Legend, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
    { name: 'Website', count: 450, fill: '#3b82f6' },
    { name: 'Email', count: 320, fill: '#10b981' },
    { name: 'WhatsApp', count: 280, fill: '#25d366' },
    { name: 'Referral', count: 150, fill: '#f59e0b' },
    { name: 'Other', count: 80, fill: '#a1a1aa' },
];

const InquirySourceRadial = () => {
    return (
        <div style={{ width: '100%', height: '100%', minHeight: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="20%"
                    outerRadius="90%"
                    barSize={10}
                    data={data}
                    startAngle={90}
                    endAngle={450}
                >
                    <RadialBar
                        background
                        dataKey="count"
                        cornerRadius={10}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 11 }}
                    />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ paddingLeft: '10px', fontSize: 9, fontWeight: 800 }}
                        iconSize={6}
                        iconType="circle"
                    />
                </RadialBarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default InquirySourceRadial;
