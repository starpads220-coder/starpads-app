import React from 'react';

interface ProgressGaugeProps {
  value: number;
  max?: number;
  label?: string;
  subLabel?: string;
  color?: string;
  bgColor?: string;
  size?: number;
}

export default function ProgressGauge({
  value,
  max = 100,
  label = "Completed",
  subLabel = "Total",
  color = "#3b82f6", // default blue
  bgColor = "#e2e8f0",
  size = 200
}: ProgressGaugeProps) {
  const percentage = Math.min(Math.max(value / max, 0), 1);
  const radius = size * 0.4;
  const strokeWidth = size * 0.12;
  const circumference = radius * Math.PI; // Semi-circle
  const strokeDashoffset = circumference - percentage * circumference;

  return (
    <div className="gauge-container" style={{ width: size, height: size * 0.6, position: 'relative', margin: '0 auto' }}>
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity={0.7} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
        {/* Background Arc */}
        <path
          d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress Arc */}
        <path
          d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
          fill="none"
          stroke={`url(#grad-${color.replace('#', '')})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="gauge-content">
        <span className="gauge-value">{Math.round(percentage * 100)}%</span>
        <span className="gauge-label">{label}</span>
      </div>
      <style jsx>{`
        .gauge-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
        }
        .gauge-content {
          position: absolute;
          bottom: 0px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .gauge-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1a1c1e;
          line-height: 1;
          font-family: var(--font-inter);
        }
        .gauge-label {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
