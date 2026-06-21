"use client";

import React from 'react';
import { User, Clock, Dot } from 'lucide-react';
import CachedImage from '@/components/common/CachedImage';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'Online' | 'Offline' | 'Away';
  lastSeen: string;
  avatar?: string;
}

interface AgentActivityListProps {
  agents: Agent[];
}

export default function AgentActivityList({ agents }: AgentActivityListProps) {
  return (
    <div className="flex flex-col gap-2 relative">
      <div className="absolute left-[13px] top-6 bottom-4 w-px bg-slate-100 hidden"></div>
      {agents.map((agent) => (
        <div key={agent.id} className="srow2 fx jb ac bg-slate-50/50 p-2 rounded-lg border border-slate-100/50 hover:bg-slate-50 transition-colors">
          <div className="fx ac gap-3 z-10 bg-transparent">
            <div className="relative">
               <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {agent.avatar ? <CachedImage src={agent.avatar} alt={agent.name} /> : <User size={12} className="text-slate-400" />}
               </div>
               <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                  agent.status === 'Online' ? 'bg-[#10b981]' :
                  agent.status === 'Away' ? 'bg-[#f59e0b]' :
                  'bg-slate-300'
               }`}></div>
            </div>
            <div className="fxc">
              <span className="title m-0 tracking-tight">{agent.name}</span>
              <span className="lbl m-0 mt-0.5">{agent.role}</span>
            </div>
          </div>
          <div className="fxc items-end">
            <span className={`bdg ${
               agent.status === 'Online' ? 'up' :
               agent.status === 'Away' ? 'neu' :
               'neu'
            }`}>
               {agent.status}
            </span>
            <span className="sub mt-1 tracking-tight">
               {agent.lastSeen}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
