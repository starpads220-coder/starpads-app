"use client";

import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface RadarData {
  subject: string;
  A: number;
  fullMark: number;
}

interface VendorCommissionRadarProps {
  data: RadarData[];
}

export default function VendorCommissionRadar({ data }: VendorCommissionRadarProps) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#f1f5f9" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 150]} hide />
          <Tooltip
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 11 }}
          />
          <Radar
            name="Vendor Performance"
            dataKey="A"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
