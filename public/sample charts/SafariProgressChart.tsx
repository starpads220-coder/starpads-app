"use client";

import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

const data = [
    {
        name: 'Progress',
        value: 72,
        fill: '#4CAF50',
    },
];

const SafariProgressChart = () => {
    return (
        <div className="chart-container" style={{ width: '100%', height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                    cx="50%"
                    cy="70%"
                    innerRadius="80%"
                    outerRadius="100%"
                    barSize={10}
                    data={data}
                    startAngle={180}
                    endAngle={0}
                >
                    <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        angleAxisId={0}
                        tick={false}
                    />
                    <RadialBar
                        background
                        dataKey="value"
                        cornerRadius={5}
                        fill="#4CAF50"
                    />
                </RadialBarChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '65%', textAlign: 'center' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1a1c1e' }}>72%</span>
                <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>Average Completion</p>
            </div>
        </div>
    );
};

export default SafariProgressChart;
