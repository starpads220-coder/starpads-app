"use client";

import React from 'react';

interface Bottleneck {
  route: string;
  frequency: string;
  avgDelay: string;
}

interface Performance {
  onTime: number;
  delayed: number;
  critical: number;
}

interface LogisticsPerformanceProps {
  performance: Performance;
  bottlenecks: Bottleneck[];
}

export default function LogisticsPerformance({ performance, bottlenecks }: LogisticsPerformanceProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="fx jb ac mb4">
        <div><div className="lbl" style={{margin:0}}>System</div><div className="title m-0">Logistics Performance</div></div>
      </div>
      <div className="flex bg-slate-50 border border-slate-100/50 rounded-xl p-3 jb ac mb-4">
        <div className="fxc acc">
          <span className="num" style={{color: '#10b981'}}>{performance.onTime}%</span>
          <span className="lbl m-0 mt-1 uppercase text-[#94a3b8] tracking-widest text-[9px]">On-Time</span>
        </div>
        <div className="h-6 w-px bg-slate-200"></div>
        <div className="fxc acc">
          <span className="num" style={{color: '#f59e0b'}}>{performance.delayed}%</span>
          <span className="lbl m-0 mt-1 uppercase text-[#94a3b8] tracking-widest text-[9px]">Delayed</span>
        </div>
        <div className="h-6 w-px bg-slate-200"></div>
        <div className="fxc acc">
          <span className="num" style={{color: '#ef4444'}}>{performance.critical}%</span>
          <span className="lbl m-0 mt-1 uppercase text-[#94a3b8] tracking-widest text-[9px]">Critical</span>
        </div>
      </div>
      
      <div className="title mb-3">Common Bottlenecks</div>
      <div className="flex flex-col gap-2">
        {bottlenecks.map(b => (
          <div key={b.route} className="srow2 fx jb ac" style={{border: '1px solid #fee2e2', background: '#fff1f2'}}>
            <div className="fxc">
              <span className="title m-0 tracking-tight" style={{color: '#991b1b'}}>{b.route}</span>
              <span className="sub mt-0" style={{color: '#b91c1c'}}>Avg Delay: {b.avgDelay}</span>
            </div>
            <div className="bdg dn" style={{background: '#fff', color: '#b91c1c', border: '1px solid #fecaca'}}>{b.frequency} Influx</div>
          </div>
        ))}
      </div>
    </div>
  );
}
