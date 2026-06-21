"use client";

import React from 'react';

interface PremiumGaugeKPIProps {
  label: string;
  value: string;
  subValue: string;
  percent: number; // 0 to 100
  colorSource?: 'green' | 'blue' | 'purple';
  footer: string;
}

export default function PremiumGaugeKPI({ 
  label, 
  value, 
  subValue, 
  percent, 
  colorSource = 'green',
  footer 
}: PremiumGaugeKPIProps) {
  // SVG Parameters
  const size = 160;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  // Color configurations
  const colors = {
    green: {
      start: '#4ade80',
      end: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.4)',
      bg: '#f0fdf4'
    },
    blue: {
      start: '#60a5fa',
      end: '#3b82f6',
      glow: 'rgba(59, 130, 246, 0.4)',
      bg: '#eff6ff'
    },
    purple: {
      start: '#a78bfa',
      end: '#7c3aed',
      glow: 'rgba(124, 58, 237, 0.4)',
      bg: '#f5f3ff'
    }
  };

  const activeColor = colors[colorSource];

  return (
    <div className="w-full flex flex-col items-center" style={{ minHeight: 180 }}>
      {/* Header Label */}
      <div className="w-full flex justify-start mb-4">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{label}</span>
      </div>

      {/* Main Gauge Content */}
      <div className="relative flex items-center justify-center mb-4" style={{ width: size, height: size }}>
        {/* SVG Gauge */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <defs>
            <linearGradient id={`gradient-green`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id={`gradient-blue`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id={`gradient-purple`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
               <feGaussianBlur stdDeviation="3" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f8fafc"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* Dot Indicators */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30) * (Math.PI / 180);
            const dotX = size / 2 + (radius) * Math.cos(angle);
            const dotY = size / 2 + (radius) * Math.sin(angle);
            return (
              <circle
                key={i}
                cx={dotX}
                cy={dotY}
                r="1.2"
                fill="#e2e8f0"
              />
            );
          })}

          {/* Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#gradient-${colorSource})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 1s ease-out',
              filter: colorSource === 'green' ? 'url(#glow)' : 'none'
            }}
          />
        </svg>

        {/* Center Text Overlay - Using precise centering */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center">
            <span className="text-[32px] font-black tracking-tighter text-slate-900 leading-none">
              {value}
            </span>
            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
              {subValue}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Label */}
      <div className="w-full mt-auto pt-4 border-t border-slate-50 flex justify-center">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{footer}</span>
      </div>
    </div>
  );
}
