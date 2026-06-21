"use client";

import React from 'react';

interface ExperienceSummaryProps {
  nps: number;
  excellentPercent: number;
}

export default function ExperienceSummary({ nps, excellentPercent }: ExperienceSummaryProps) {
  return (
    <div className="flex gap-6 items-center">
      <div className="fxc">
        <span className="lbl" style={{margin:0, color:'#10b981'}}>System NPS</span>
        <div className="num mt-1" style={{color:'#065f46'}}>{nps.toFixed(1)}</div>
      </div>
      <div className="h-10 w-px bg-emerald-200"></div>
      <div className="fxc flex-1">
        <div className="fx jb ac mb-1">
          <span className="lbl m-0">Excellent</span>
          <span className="title m-0">{excellentPercent}%</span>
        </div>
        <div className="prog-track" style={{background: '#d1fae5'}}><div className="prog-fill bg-emerald-500" style={{width: `${excellentPercent}%`}}></div></div>
      </div>
    </div>
  );
}
