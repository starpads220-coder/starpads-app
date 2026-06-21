import React from 'react';
import { Star, ShieldCheck, MapPin, BarChart } from 'lucide-react';
import './ChartSetup';

import VendorCommissionRadar from './VendorCommissionRadar';
import TopPropertiesList from './TopPropertiesList';
import PropertyDensityGrid from './PropertyDensityGrid';

const radarData = [
  { subject: 'Reliability', A: 120, fullMark: 150 },
  { subject: 'Pricing', A: 98, fullMark: 150 },
  { subject: 'Comms', A: 86, fullMark: 150 },
  { subject: 'Quality', A: 99, fullMark: 150 },
  { subject: 'Compliance', A: 85, fullMark: 150 },
];

const propertiesData = [
  { name: 'Four Seasons Serengeti', bookings: 142, rating: 4.9, cost: '$1,200/n' },
  { name: 'Singita Sasakwa Lodge', bookings: 86, rating: 5.0, cost: '$2,450/n' },
  { name: '&Beyond Ngorongoro', bookings: 64, rating: 4.8, cost: '$1,680/n' },
  { name: 'Mara Expedition Camp', bookings: 52, rating: 4.7, cost: '$980/n' },
];

const densityData = [
  { name: 'Jan', days: Array.from({length: 31}, (_, i) => ({ day: i+1, intensity: Math.floor(Math.random() * 5) })) },
  { name: 'Feb', days: Array.from({length: 28}, (_, i) => ({ day: i+1, intensity: Math.floor(Math.random() * 5) })) },
  { name: 'Mar', days: Array.from({length: 31}, (_, i) => ({ day: i+1, intensity: Math.floor(Math.random() * 5) })) },
  { name: 'Apr', days: Array.from({length: 30}, (_, i) => ({ day: i+1, intensity: Math.floor(Math.random() * 5) })) },
];

export default function VendorMetricsBlock() {
  return (
    <>
      <div className="card-ref s4">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Benchmarks</div><div className="title m-0">Supplier Performance Radar</div></div>
           <ShieldCheck size={14} className="text-blue-500" />
         </div>
         <div className="chart-wrap flex-1 min-h-[180px]">
           <VendorCommissionRadar data={radarData} />
         </div>
      </div>

      <div className="card-ref s4">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Rankings</div><div className="title m-0">Top Performing Properties</div></div>
           <Star size={14} className="text-yellow-500" />
         </div>
         <TopPropertiesList properties={propertiesData} />
      </div>

      <div className="card-ref s4">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Availability</div><div className="title m-0">Density Grid</div></div>
           <MapPin size={14} className="text-emerald-500" />
         </div>
         <PropertyDensityGrid data={densityData} />
         <div className="sub mt-3 text-center uppercase tracking-widest">High-Season Lodge Saturation</div>
      </div>

      <div className="card-ref s6" style={{background: '#fff1f2', border: '1px solid #ffe4e6'}}>
         <div className="lbl" style={{color: '#f87171'}}>Vendor Liability Exposure</div>
         <div className="title mb4" style={{color: '#991b1b'}}>Unreconciled Prepayments</div>
         <div className="num" style={{color: '#ef4444'}}>$12,400</div>
         <div className="sub" style={{color: '#f87171'}}>Unreconciled prepayments</div>
         <div className="flex gap-1 mt-4">
            <div className="w-1/3 h-[6px] bg-red-500 rounded-full"></div>
            <div className="w-2/3 h-[6px] bg-red-100 rounded-full"></div>
         </div>
      </div>

      <div className="card-ref s6">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Allocation</div><div className="title m-0">Market Share Diversification</div></div>
           <BarChart size={14} className="text-blue-500" />
         </div>
         <div className="flex flex-col gap-3">
            <div className="fxc">
               <div className="fx jb ac mb-1">
                  <span className="lbl m-0">Luxury Tents</span>
                  <span className="title m-0">42%</span>
               </div>
               <div className="prog-track"><div className="prog-fill bg-blue-600" style={{width: '42%'}}></div></div>
            </div>
            <div className="fxc">
               <div className="fx jb ac mb-1">
                  <span className="lbl m-0">Permanent Lodges</span>
                  <span className="title m-0">38%</span>
               </div>
               <div className="prog-track"><div className="prog-fill bg-emerald-500" style={{width: '38%'}}></div></div>
            </div>
            <div className="fxc">
               <div className="fx jb ac mb-1">
                  <span className="lbl m-0">Mobile Camps</span>
                  <span className="title m-0">20%</span>
               </div>
               <div className="prog-track"><div className="prog-fill bg-orange-400" style={{width: '20%'}}></div></div>
            </div>
         </div>
      </div>

      <div className="card-ref s6 card-dark bg-slate-900 border-none relative overflow-hidden">
         <div className="lbl" style={{color: '#94a3b8'}}>Rejection Rate (Camps Full)</div>
         <div className="num text-white mt-1">14.2%</div>
         <div className="sub" style={{color: '#64748b'}}>High season bottleneck identified</div>
         <div className="mt4"><span className="bdg dn" style={{background: '#450a0a', color: '#f87171'}}>▼ Capacity issue</span></div>
         <div className="mt-4 h-6 border-b border-slate-800 relative">
           <div className="absolute right-0 bottom-0 h-full w-[14.2%] bg-red-500/80 rounded-t"></div>
         </div>
      </div>
    </>
  );
}
