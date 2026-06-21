"use client";

import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
    { subject: 'Speed', A: 120, B: 110, fullMark: 150 },
    { subject: 'Accuracy', A: 98, B: 130, fullMark: 150 },
    { subject: 'Communication', A: 86, B: 130, fullMark: 150 },
    { subject: 'Bookings', A: 99, B: 100, fullMark: 150 },
    { subject: 'Support', A: 85, B: 90, fullMark: 150 },
    { subject: 'Reviews', A: 65, B: 85, fullMark: 150 },
];

const AgentPerformanceRadar = () => {
    return (
        <div style={{ width: '100%', height: '100%', minHeight: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 150]} hide />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 11 }}
                    />
                    <Radar
                        name="Top Agent"
                        dataKey="A"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.15}
                        strokeWidth={2}
                    />
                    <Radar
                        name="Team Average"
                        dataKey="B"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.1}
                        strokeWidth={2}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AgentPerformanceRadar;
