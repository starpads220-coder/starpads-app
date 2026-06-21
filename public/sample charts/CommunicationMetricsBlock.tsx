import React from 'react';
import { Clock, ShieldAlert, MessageSquare, BarChart3, Mail, Map as MapIcon } from 'lucide-react';
import './ChartSetup';

import BookingInquiryTrends from './BookingInquiryTrends';
import BookingHeatmap from './BookingHeatmap';

const inquiryTrendsData = [
  { month: 'Jan', leads: 45, itineraries: 38, bookings: 12 },
  { month: 'Feb', leads: 52, itineraries: 42, bookings: 15 },
  { month: 'Mar', leads: 48, itineraries: 35, bookings: 18 },
  { month: 'Apr', leads: 70, itineraries: 62, bookings: 25 },
  { month: 'May', leads: 65, itineraries: 58, bookings: 22 },
  { month: 'Jun', leads: 82, itineraries: 75, bookings: 30 },
];

export default function CommunicationMetricsBlock() {
  return (
    <>
      <div className="card-ref s3">
         <div className="ico" style={{backgroundColor: '#10b981'}}>
             <Clock size={16} color="#fff" strokeWidth={2.2}/>
         </div>
         <div className="lbl">Time to First Response</div>
         <div className="num">12<span style={{fontSize: 16}}>m</span></div>
         <div className="sub">Average across channels</div>
         <div className="mt4"><span className="bdg up">▲ Top 10% Industry Avg</span></div>
      </div>

      <div className="card-ref s3">
         <div className="fx jb ac mb4">
            <div className="lbl" style={{margin:0}}>Inbox Zero</div>
            <span className="bdg up">▲ Consistent</span>
         </div>
         <div className="num mb4">92%</div>
         <div className="sub">End of day unread clearance</div>
         
         <div className="fxc mt4" style={{marginTop: 'auto'}}>
            <div className="fx jb ac text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="fxc ac gap-2"><span>M</span><div className="sq" style={{background:'#2563eb'}}></div></div>
                <div className="fxc ac gap-2"><span>T</span><div className="sq" style={{background:'#2563eb'}}></div></div>
                <div className="fxc ac gap-2"><span>W</span><div className="sq" style={{background:'#2563eb'}}></div></div>
                <div className="fxc ac gap-2"><span>T</span><div className="sq" style={{background:'#e2e8f0'}}></div></div>
                <div className="fxc ac gap-2"><span>F</span><div className="sq" style={{background:'#2563eb'}}></div></div>
            </div>
         </div>
      </div>

      <div className="card-ref s4">
         <div className="lbl">Thread Resolution Speed</div>
         <div className="title mb4">Resolution Analytics</div>
         <div className="fxc mt4 gap-1">
             <div className="srow2">
                <div className="avatar" style={{background:'#10b981'}}>W</div>
                <div className="fxc" style={{flex:1}}>
                    <div className="title" style={{margin:0}}>Closed Won</div>
                    <div className="sub">Avg days to resolution</div>
                </div>
                <div className="num-sm">4.2d</div>
             </div>
             <div className="srow2">
                <div className="avatar" style={{background:'#0f172a'}}>L</div>
                <div className="fxc" style={{flex:1}}>
                    <div className="title" style={{margin:0}}>Closed Lost</div>
                    <div className="sub">Avg days to resolution</div>
                </div>
                <div className="num-sm" style={{color:'#64748b'}}>8.5d</div>
             </div>
         </div>
      </div>

      <div className="card-ref s2">
         <div className="lbl">Volume Flow</div>
         <div className="title mb4">In vs Out</div>
         <div className="num mt2">214 <span style={{fontSize: 16, color: '#94a3b8'}}>/ 350</span></div>
         <div className="sub">Slight bottleneck forming</div>
         <div className="prog-track mt4" style={{display:'flex'}}>
           <div className="prog-fill" style={{width: '38%', background: '#ef4444'}}></div>
           <div className="prog-fill" style={{width: '62%', background: '#2563eb'}}></div>
         </div>
      </div>

      <div className="card-ref s6 flex flex-col pt-3">
         <div className="fx jb ac mb4">
            <div><div className="lbl" style={{margin:0}}>Funnel</div><div className="title m-0">Inquiry & Conversion Lifecycle</div></div>
            <BarChart3 size={14} className="text-blue-500" />
         </div>
         <div className="chart-wrap flex-1 -mb-2 min-h-[140px]">
            <BookingInquiryTrends data={inquiryTrendsData} />
         </div>
      </div>

      <div className="card-ref s6 flex flex-col pt-3">
         <div className="fx jb ac mb4">
            <div><div className="lbl" style={{margin:0}}>Channels</div><div className="title m-0">Inquiry Interaction Heatmap</div></div>
            <MapIcon size={14} className="text-emerald-500" />
         </div>
         <div className="chart-wrap flex-1 mt-2 -mb-2 min-h-[140px]">
            <BookingHeatmap />
         </div>
      </div>

      <div className="card-ref s4 card-dark">
         <div className="ico" style={{backgroundColor: '#ef4444'}}>
             <ShieldAlert size={16} color="#fff" strokeWidth={2.2}/>
         </div>
         <div className="lbl" style={{color: '#94a3b8'}}>Spam / Bounce Velocity</div>
         <div className="num" style={{color: '#fff'}}>1.2%</div>
         <div className="sub" style={{color: '#64748b'}}>Domain health optimal</div>
         <div className="mt4"><span className="bdg up" style={{background: '#134e4a', color: '#2dd4bf'}}>▲ Exceptional</span></div>
      </div>

      <div className="card-ref s4">
         <div className="ico" style={{backgroundColor: '#0f172a'}}>
             <Mail size={16} color="#fff" strokeWidth={2.2}/>
         </div>
         <div className="lbl">Template Gov</div>
         <div className="num mt2">85%</div>
         <div className="sub">Pre-built origination</div>
         <div className="prog-track mt-4"><div className="prog-fill bg-slate-800" style={{width: '85%'}}></div></div>
      </div>

      <div className="card-ref s4" style={{background: '#fff1f2', border: '1px solid #ffe4e6'}}>
         <div className="lbl" style={{color: '#f87171'}}>Intervention Alert</div>
         <div className="title mb4" style={{color: '#991b1b'}}>Toxic Sentiment</div>
         <div className="num mt2" style={{color: '#dc2626'}}>3</div>
         <div className="sub" style={{color: '#f87171'}}>Threads flagged</div>
      </div>
    </>
  );
}

