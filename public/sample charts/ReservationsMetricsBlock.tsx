import React from 'react';
import { BarChart3, PieChart as PieIcon, Users } from 'lucide-react';
import './ChartSetup';

import InquirySourceRadial from './InquirySourceRadial';
import ReservationFlowChart from './ReservationFlowChart';
import AgentPerformanceRadar from './AgentPerformanceRadar';

const agentLeaderboard = [
  { id: '1', name: 'Sarah Taylor', leads: 92, conversion: 42, color: '#3b82f6' },
  { id: '2', name: 'Mike Kibaki', leads: 45, conversion: 38, color: '#10b981' },
  { id: '3', name: 'Jane Lock', leads: 120, conversion: 24, color: '#64748b' },
];

export default function ReservationsMetricsBlock() {
  return (
    <>
      <div className="card-ref s4 card-dark bg-slate-900 border-none relative overflow-hidden">
         <div className="lbl" style={{color: '#94a3b8'}}>Live Pipeline Value (Deposits Pending)</div>
         <div className="num text-white mt-1">$412,890</div>
         <div className="mt4"><span className="bdg" style={{background: '#1e3a5f', color: '#60a5fa'}}>High Conversion Probability</span></div>
         <div className="prog-track mt-6 h-[4px] flex overflow-hidden" style={{background: '#1e293b'}}>
           <div style={{width: '65%', background: '#3b82f6', borderRadius: 4}}></div>
         </div>
         <div className="absolute right-0 bottom-0 w-1/3 h-full bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none"></div>
      </div>

      <div className="card-ref s2">
         <div className="lbl">Avg Booking Lead Time</div>
         <div className="num mt-1" style={{fontSize: 22}}>182 <span className="text-[12px] font-bold text-slate-400">Days</span></div>
         <div className="sub">Booking to travel date</div>
      </div>

      <div className="card-ref s2 bg-emerald-50/50 border border-emerald-100/50">
         <div className="lbl" style={{color: '#10b981'}}>Repeat Customer Index</div>
         <div className="num mt-1" style={{fontSize: 22, color: '#065f46'}}>28%</div>
         <div className="sub" style={{color: '#10b981', fontWeight: 700}}>Extremely high loyalty</div>
      </div>

      <div className="card-ref s4">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Pipeline</div><div className="title m-0">Reservation Flow Velocity</div></div>
           <BarChart3 size={14} className="text-blue-500" />
         </div>
         <div className="chart-wrap flex-1 min-h-[180px]">
           <ReservationFlowChart />
         </div>
      </div>

      <div className="card-ref s4">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Sources</div><div className="title m-0">Inquiry Source Attribution</div></div>
           <PieIcon size={14} className="text-blue-500" />
         </div>
         <div className="chart-wrap flex-1 min-h-[180px]">
           <InquirySourceRadial />
         </div>
      </div>

      <div className="card-ref s4">
         <div className="lbl">Collection Speed (DSO)</div>
         <div className="title mb4">Payment Velocity</div>
         <div className="num mt-1">4.2 <span className="text-[12px] font-bold text-slate-400">Days</span></div>
         <div className="flex w-full mt-4 justify-between border-b border-slate-100/60 pb-1">
           <span className="lbl m-0">Inv</span> <span className="lbl m-0">View</span> <span className="lbl m-0">Paid</span>
         </div>
         <div className="flex pt-2 gap-1">
           <div className="w-[80%] h-[6px] bg-blue-500 rounded-full"></div>
           <div className="w-[20%] h-[6px] bg-slate-100 rounded-full"></div>
         </div>
      </div>

      <div className="card-ref s6">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Benchmarking</div><div className="title m-0">Agent Relative Performance</div></div>
           <Users size={14} className="text-blue-500" />
         </div>
         <div className="chart-wrap flex-1 min-h-[180px]">
           <AgentPerformanceRadar />
         </div>
      </div>

      <div className="card-ref s6 flex flex-col">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Leaderboard</div><div className="title m-0">Agent Win-Rate</div></div>
           <span className="sub m-0">Sorted by Conversion %</span>
         </div>
         {agentLeaderboard.map(agent => (
            <div key={agent.id} className="srow fx jb ac">
               <div className="fx ac gap-3">
                  <div className="avatar" style={{ backgroundColor: agent.color }}>
                     {agent.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="fxc">
                     <span className="title m-0">{agent.name}</span>
                     <span className="sub mt-0">{agent.leads} Leads</span>
                  </div>
               </div>
               <div className="num-sm" style={{ color: agent.color }}>{agent.conversion}%</div>
            </div>
         ))}
      </div>

      <div className="card-ref s2" style={{background: '#fff1f2', border: '1px solid #ffe4e6'}}>
         <div className="lbl" style={{color: '#f87171'}}>Payment Fail Rate</div>
         <div className="num mt-1" style={{color:'#991b1b'}}>1.4%</div>
         <div className="sub" style={{color: '#f87171'}}>Stripe Drops</div>
      </div>

      <div className="card-ref s2">
         <div className="lbl">Avg Party Size</div>
         <div className="num mt-1">3.2</div>
         <div className="sub" style={{fontWeight: 700}}>Families dominating Q3</div>
      </div>
    </>
  );
}
