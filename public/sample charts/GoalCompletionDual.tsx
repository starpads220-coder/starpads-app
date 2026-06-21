"use client";

import React from 'react';
import ProgressGauge from './ProgressGauge';

interface GoalCompletionDualProps {
  signalCompletion: number;
  additionalCompletion: number;
}

export default function GoalCompletionDual({ signalCompletion, additionalCompletion }: GoalCompletionDualProps) {
  return (
    <div className="fxc ac w-full pt-2">
      <div className="relative">
        <ProgressGauge 
          value={signalCompletion} 
          max={100} 
          label="Signal" 
          color="#D97706" 
          size={140} 
        />
        <div className="absolute inset-0 fxc ac jc pt-8 pointer-events-none">
          <span className="num m-0" style={{fontSize: 24}}>{signalCompletion}%</span>
        </div>
      </div>
      <div className="w-full mt-2 bg-slate-50/50 border border-slate-100/50 p-2 rounded-lg">
        <div className="fx jb ac mb-1">
          <span className="lbl m-0">Additional Tasks</span>
          <span className="title m-0 tracking-tight">{additionalCompletion}%</span>
        </div>
        <div className="prog-track mt-1"><div className="prog-fill bg-blue-500" style={{width: `${additionalCompletion}%`}}></div></div>
      </div>
    </div>
  );
}
