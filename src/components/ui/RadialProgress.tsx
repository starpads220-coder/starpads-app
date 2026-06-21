import React, { useEffect, useState } from "react";

interface RadialProgressProps {
  value: number; // 0 to 100
  label?: string;
  subLabel?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

export function RadialProgress({
  value,
  label,
  subLabel,
  size = 120,
  strokeWidth = 10,
  color = "#3b82f6", // default blue
  className = "",
}: RadialProgressProps) {
  const [offset, setOffset] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    // Animate on mount
    const progressOffset = circumference - (value / 100) * circumference;
    // Small delay to ensure CSS transition works on mount
    const timeout = setTimeout(() => setOffset(progressOffset), 50);
    return () => clearTimeout(timeout);
  }, [value, circumference]);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset || circumference}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        {label && <span className="text-xl font-bold text-gray-900 leading-none">{label}</span>}
        {subLabel && <span className="text-xs text-gray-500 mt-1">{subLabel}</span>}
      </div>
    </div>
  );
}
