"use client";

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Chart } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const chartData = {
  labels: ['Q3 21', 'Q4 21', 'Q1 22', 'Q2 22', 'Q3 22', 'Q4 22', 'Q1 23'],
  datasets: [
    {
      type: 'bar' as const,
      label: 'Revenue',
      data: [3.2, 4.5, 3.1, 4.8, 3.4, 4.2, 4.9],
      backgroundColor: '#3b82f6',
      borderRadius: 20, 
      barPercentage: 0.4,
      order: 2,
    },
    {
      type: 'bar' as const,
      label: 'Net Income',
      data: [1.2, 1.8, 0.8, 1.4, -0.6, -1.2, 0.9],
      backgroundColor: '#00d95a', 
      borderRadius: 20,
      barPercentage: 0.4,
      order: 3,
    },
    {
      type: 'line' as const,
      label: 'Profit Margin',
      data: [2.2, 3.4, 0.9, 0.8, 0.6, 0.2, 1.5],
      borderColor: '#000000',
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0.4,
      order: 1,
    }
  ],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 10, weight: 'bold' as const }, color: '#94a3b8' },
      border: { display: false },
    },
    y: {
      position: 'right' as const,
      grid: { color: '#f1f5f9' },
      ticks: { 
        font: { size: 10 }, 
        color: '#94a3b8',
        callback: (value: any) => value + 'B'
      },
      border: { display: false },
    }
  },
};

export default function PaxProfitReferenceCard() {
  return (
    <div className="w-full flex flex-col pt-2">
      {/* 1. Core Figures Only (As requested) */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-[42px] font-black tracking-tighter text-slate-900 leading-none">$1,420</span>
          <span className="text-[14px] font-extrabold text-slate-400 uppercase tracking-tight">USD</span>
        </div>
        
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f0fdf4] text-[#00d95a] border border-[#dcfce7]">
          <span className="text-[12px] font-black">12.2% (+154)</span>
          <TrendingUp size={12} strokeWidth={3} />
        </div>
      </div>

      {/* 2. Focused Infographic Chart */}
      <div className="w-full h-64 relative -mx-2">
        <Chart type='bar' data={chartData} options={chartOptions as any} />
      </div>
    </div>
  );
}
