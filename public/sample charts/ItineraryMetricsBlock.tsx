import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Map as MapIcon, ListChecks, Calendar, Clock, Eye, Layers } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import './ChartSetup'; 
import { itineraryDB } from '@/utils/db';

import TopDestinationsBar from './TopDestinationsBar';
import TripDurationBar from './TripDurationBar';
import ItineraryWorkflowTasks from './ItineraryWorkflowTasks';

const conversionOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: { x: { display: false }, y: { display: false } }
};

export default function ItineraryMetricsBlock() {
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const all = await itineraryDB.getAll();
        setItineraries(all);
      } catch (err) {
        console.error("Failed to fetch itineraries", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => {
    if (itineraries.length === 0) return {
      conversion: 0,
      avgDelivery: 0,
      abandonment: 0,
      avgRevisions: 0,
      avgYield: 0,
      destinationData: [],
      durationData: [],
      workflowTasks: []
    };

    const totalCount = itineraries.length;
    const bookedCount = itineraries.filter(it => it.status === 'booked' || it.fullData?.status === 'Accepted (Booked)').length;
    const abandonedCount = itineraries.filter(it => it.status === 'abandoned' || it.fullData?.status === 'Rejected' || it.fullData?.status === 'Abandoned').length;
    
    // Average Revisions
    const totalRevisions = itineraries.reduce((sum, it) => sum + (it.revisionCount || 0), 0);
    
    // Average Delivery Time (Hours)
    const deliveryTimes = itineraries
      .filter(it => it.createdAt && it.deliveredAt)
      .map(it => (new Date(it.deliveredAt).getTime() - new Date(it.createdAt).getTime()) / (1000 * 60 * 60));
    const avgDelivery = deliveryTimes.length > 0 ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length : 0;

    // Average Yield (Markup Percentage)
    const yields = itineraries
      .filter(it => it.price && it.fullData?.totalPrice)
      .map(it => {
        const price = parseFloat(it.price.replace(/,/g, '')) || 0;
        const cost = parseFloat(it.fullData.totalPrice.replace(/,/g, '')) || 0;
        return cost > 0 ? ((price - cost) / cost) * 100 : 0;
      });
    const avgYield = yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : 0;

    // Trend Data (Last 6 Months)
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const last6Months: { month: string, monthIdx: number, year: number, booked: number, total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        month: monthNames[d.getMonth()],
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
        booked: 0,
        total: 0
      });
    }

    itineraries.forEach(it => {
      if (!it.createdAt) return;
      const d = new Date(it.createdAt);
      const mIdx = d.getMonth();
      const yIdx = d.getFullYear();
      const bucket = last6Months.find(b => b.monthIdx === mIdx && b.year === yIdx);
      if (bucket) {
        bucket.total++;
        if (it.status === 'booked' || it.fullData?.status === 'Accepted (Booked)') {
          bucket.booked++;
        }
      }
    });

    const trendData = last6Months.map(b => b.total > 0 ? (b.booked / b.total) * 100 : 0);
    const trendLabels = last6Months.map(b => b.month);

    // Trip Duration Data
    const durationBuckets = [
      { days: '1-3 Days', min: 1, max: 3, count: 0 },
      { days: '4-7 Days', min: 4, max: 7, count: 0 },
      { days: '8-12 Days', min: 8, max: 12, count: 0 },
      { days: '13-20 Days', min: 13, max: 20, count: 0 },
      { days: '21+ Days', min: 21, max: 999, count: 0 },
    ];

    itineraries.forEach(it => {
      const d = it.days || 0;
      const bucket = durationBuckets.find(b => d >= b.min && d <= b.max);
      if (bucket) bucket.count++;
    });

    return {
      conversion: totalCount > 0 ? ((bookedCount / totalCount) * 100).toFixed(1) : "0",
      avgDelivery: avgDelivery.toFixed(1),
      abandonment: totalCount > 0 ? ((abandonedCount / totalCount) * 100).toFixed(1) : "0",
      avgRevisions: (totalRevisions / totalCount).toFixed(1),
      avgYield: avgYield.toFixed(1),
      durationData: durationBuckets.map(b => ({ days: b.days, count: b.count })),
      trendData,
      trendLabels
    };
  }, [itineraries]);

  const conversionDataCfg = {
    labels: metrics.trendLabels || ['Jan','Feb','Mar','Apr','May','Jun'],
    datasets: [{
      data: metrics.trendData || [40, 55, 42, 68, 62, 80],
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,0.1)',
      fill: true,
      tension: 0.45,
      borderWidth: 1.5,
      pointRadius: 0
    }]
  };

  const workflowTasks = [
    { id: '1', title: 'Verify Lodge Availability', completed: true, priority: 'High' as const },
    { id: '2', title: 'Confirm Internal Flights', completed: false, priority: 'High' as const },
    { id: '3', title: 'Map Route Optimization', completed: false, priority: 'Medium' as const },
    { id: '4', title: 'Calculate Final Margin', completed: false, priority: 'Low' as const },
  ];

  if (loading) return <div className="p-8 text-center text-slate-400 font-semibold tracking-tight">Loading Operational Metrics...</div>;

  return (
    <>
      <div className="card-ref s3">
         <div className="fx jb ac"><div className="lbl" style={{margin:0}}>Booking Success Trend</div><span className="bdg up">▲ 4.2%</span></div>
         <div className="num mt2 mb4">{metrics.conversion}%</div>
         <div className="sub mb4">Percentage of Quotes Finalized</div>
         <div className="chart-wrap" style={{height: 48, marginTop: 'auto', marginInline: -18, marginBottom: -14}}>
            <Line data={conversionDataCfg} options={conversionOptions} />
         </div>
      </div>

      <div className="card-ref s3">
         <div className="lbl">Quote Delivery Speed</div>
         <div className="fx g8 ac mt2">
           <div className="fxc"><div className="num">{metrics.avgDelivery}<span style={{fontSize: 16}}>h</span></div><div className="sub">Avg delivery time</div></div>
           <div className="fxc ac" style={{marginLeft: 'auto'}}><div className="num-sm" style={{color: '#16a34a'}}>-1.5h</div><div className="sub">Faster vs Prev</div></div>
         </div>
         <div className="divider mt6"></div>
         <div className="fx jb" style={{fontSize: '9px', color: '#aaa', marginTop: '2px'}}><span>Standard</span><span>Complex</span></div>
         <div className="prog-track mt4" style={{height: 5, display: 'flex'}}>
            <div className="prog-fill" style={{width: '35%', background: '#2563eb', borderRadius: '4px 0 0 4px'}}></div>
            <div className="prog-fill" style={{width: '65%', background: '#94a3b8', borderRadius: '0 4px 4px 0'}}></div>
         </div>
      </div>

      <div className="card-ref s3 card-dark shadow-xl bg-[#0f172a] border-none">
         <div className="lbl">Lost Opportunities</div>
         <div style={{fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 2, letterSpacing: -0.5}}>{metrics.abandonment}%</div>
         <span className="bdg dn mt4" style={{display: 'inline-flex', background: '#450a0a', color: '#f87171'}}>▼ Drop-off Rate</span>
         <div className="chart-wrap mt6" style={{height: 44, marginInline: -18, marginBottom: -14}}>
             <svg style={{width:'100%',height:44}} viewBox="0 0 200 44" preserveAspectRatio="none">
                 <path d="M0,22 Q50,44 100,22 T200,30" stroke="#f87171" strokeWidth="2" fill="none"/>
                 <path d="M0,22 Q50,44 100,22 T200,30 L200,44 L0,44 Z" fill="rgba(248,113,113,0.1)"/>
             </svg>
         </div>
      </div>

      <div className="card-ref s3">
         <div className="ico" style={{backgroundColor: '#8b5cf6'}}>
           <Eye size={16} color="#fff" strokeWidth={2.2}/>
         </div>
         <div className="lbl">Client Interest Level</div>
         <div className="num">14m 20s</div>
         <div className="sub">Avg time spent on link</div>
         <div className="mt4"><span className="bdg up">▲ High engagement</span></div>
      </div>

      <div className="card-ref s6 flex flex-col pt-3">
         <div className="fx jb ac mb4">
            <div><div className="lbl" style={{margin:0}}>Most Popular Regions</div><div className="title m-0">Destination Booking Popularity</div></div>
            <MapIcon size={14} className="text-blue-500" />
         </div>
         <div className="chart-wrap flex-1 mt-2 -mb-2 min-h-[140px]">
             <TopDestinationsBar itineraries={itineraries} />
         </div>
      </div>

      <div className="card-ref s3">
         <div className="ico" style={{backgroundColor: '#0891b2'}}>
           <ListChecks size={16} color="#fff" strokeWidth={2.2}/>
         </div>
         <div className="lbl">Edit Frequency</div>
         <div className="num">{metrics.avgRevisions}<span style={{fontSize: 16}}>x</span></div>
         <div className="sub">Avg revisions per request</div>
         <div className="mt4"><span className="bdg neu">Tracking Revisions</span></div>
      </div>

      <div className="card-ref s3">
         <div className="ico" style={{backgroundColor: '#10b981'}}>
           <TrendingUp size={16} color="#fff" strokeWidth={2.2}/>
         </div>
         <div className="lbl">Live Profit Margin</div>
         <div className="num">{metrics.avgYield}%</div>
         <div className="sub">Revenue vs Supply Costs</div>
         <div className="mt4"><span className="bdg up">▲ Live Yield</span></div>
      </div>

      <div className="card-ref s4">
         <div className="lbl">Itinerary Duration Mix</div>
         <div className="title mb4">Trip Length Distribution</div>
         <TripDurationBar data={metrics.durationData as any} maxCount={Math.max(...metrics.durationData.map(d => d.count), 10)} />
      </div>

      <div className="card-ref s4">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Operational Priority</div><div className="title m-0">Active Workflow Tasks</div></div>
           <span style={{fontSize: 10, color: '#2563eb', fontWeight: 600, cursor: 'pointer'}}>View All</span>
         </div>
         <ItineraryWorkflowTasks tasks={workflowTasks} />
      </div>

      <div className="card-ref s4">
         <div className="ico" style={{backgroundColor: '#f59e0b'}}>
            <Layers size={16} color="#fff" strokeWidth={2.2} />
         </div>
         <div className="lbl">Content Usage</div>
         <div className="title mb4">Feature Embed Utilization</div>
         <div className="num mt2 text-[26px]">82%</div>
         <div className="sub">Itineraries use interactive maps</div>
         
         <div className="fxc mt4 gap-2 text-[10px] font-semibold text-slate-600 tracking-tight" style={{marginTop: 'auto'}}>
           <div className="fx jb ac">
              <span className="flex items-center gap-2">
                 <div className="chk on" style={{borderColor: '#10b981', background: '#10b981'}}></div> Custom Maps
              </span> 
              <span>82%</span>
           </div>
           <div className="fx jb ac">
              <span className="flex items-center gap-2">
                 <div className="chk on" style={{borderColor: '#3b82f6', background: '#3b82f6'}}></div> Camp Videos
              </span> 
              <span>64%</span>
           </div>
         </div>
      </div>
    </>
  );
}
