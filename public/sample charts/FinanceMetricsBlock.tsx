"use client";

import React from 'react';
import { DollarSign, TrendingUp, Activity, AlertTriangle } from 'lucide-react';
import './ChartSetup';

import RevenueAreaChart from './RevenueAreaChart';
import RevenueKPI from './RevenueKPI';
import RevenueTargetGauge from './RevenueTargetGauge';
import CostBreakdownPie from './CostBreakdownPie';
import PaymentStatus from './PaymentStatus';
import PillarInvoicesList from './PillarInvoicesList';
import ExpenseStructureChart from './ExpenseStructureChart';
import PremiumGaugeKPI from './PremiumGaugeKPI';
import PaxProfitReferenceCard from './PaxProfitReferenceCard';
import NegotiationYieldRefined from './NegotiationYieldRefined';

const expenseData = [
  { month: 'Jan', revenue: 45000, expenses: 32000, profit: 13000 },
  { month: 'Feb', revenue: 52000, expenses: 34000, profit: 18000 },
  { month: 'Mar', revenue: 48000, expenses: 31000, profit: 17000 },
  { month: 'Apr', revenue: 61000, expenses: 38000, profit: 23000 },
];

const invoiceData = [
  { id: 'INV-001', customer: 'Global Safaris Ltd', amount: '$4,200', status: 'Paid' as const, date: '2024-03-20' },
  { id: 'INV-002', customer: 'Eco-Travel Group', amount: '$3,850', status: 'Pending' as const, date: '2024-03-21' },
  { id: 'INV-003', customer: 'Highland Expeditions', amount: '$5,120', status: 'Late' as const, date: '2024-03-15' },
];

/* FX loss sparkline data */
const fxBars = [12, 18, 9, 14, 8, 18, 16, 10, 19, 15, 11, 20, 14, 22];

/* Park fee volatility wave data */
const volatilityWave = [4, 7, 5, 12, 8, 15, 11, 18, 14, 10, 16, 8, 13, 6, 11, 9];

export default function FinanceMetricsBlock() {
  return (
    <>
      {/* ── Card 1: Revenue Growth Trajectory  (6-col area chart) ── */}
      <div className="card-ref s6 flex flex-col pt-3">
         <div className="fx jb ac mb4">
            <div>
              <div className="lbl" style={{margin:0}}>Revenue Trajectory</div>
              <div className="title" style={{margin:0}}>Growth Analytics</div>
            </div>
            <div className="fx" style={{gap: 12}}>
              <span className="fx ac g4" style={{fontSize:9,color:'#555'}}><span className="dot" style={{background:'#7c3aed'}}></span>Actual</span>
              <span className="fx ac g4" style={{fontSize:9,color:'#555'}}><span className="dot" style={{background:'#0ea5e9'}}></span>Projected</span>
            </div>
         </div>
         <div className="chart-wrap flex-1 -mx-2">
            <RevenueAreaChart />
         </div>
      </div>

      {/* ── Card 2: Profitability Gauge (3-col half-donut) ── */}
      <div className="card-ref s3">
         <div className="lbl">Target GP Variance</div>
         <div className="title mb4">Profitability</div>
         <div className="num mt2" style={{color: '#7c3aed', fontSize: 26}}>+1.2%</div>
         <div className="sub">Realized higher than quoted</div>
         <div className="mt-3 flex-1 flex flex-col justify-end">
            <RevenueTargetGauge current={98000} target={120000} />
         </div>
      </div>

      {/* ── Card 3: FX Attrition — Red accent card with sparkline bars ── */}
      <div className="card-ref s3" style={{
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        border: 'none',
        overflow: 'hidden',
        position: 'relative',
      }}>
         {/* Accent circle — reference health CTA style */}
         <div style={{
           position: 'absolute', top: -20, right: -20,
           width: 70, height: 70, borderRadius: '50%',
           background: '#fff', opacity: 0.08,
         }} />
         
         <div className="lbl" style={{color: 'rgba(255,255,255,0.6)'}}>FX Attrition (Loss)</div>
         <div className="num" style={{color: '#ffffff', fontSize: 28, letterSpacing: -1}}>-$4,210</div>
         <div className="sub mt-1" style={{color: 'rgba(255,255,255,0.5)'}}>Currency bleed on live deals</div>
         <div className="mt-2"><span className="bdg" style={{background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.9)', border: 'none', fontSize: 8}}>▼ Requires hedging</span></div>
         
         {/* Sparkline bar chart — reference heart-rate bar style */}
         <div style={{
           display: 'flex', alignItems: 'flex-end', gap: 3,
           marginTop: 'auto', paddingTop: 10, height: 40,
         }}>
           {fxBars.map((val, i) => (
             <div key={i} style={{
               flex: 1, height: `${(val / 22) * 100}%`,
               background: i === fxBars.length - 1 ? '#fff' : 'rgba(255,255,255,0.35)',
               borderRadius: 3,
               transition: 'height 0.3s ease',
             }} />
           ))}
         </div>
      </div>

      {/* ── Card 4: Net Profit per PAX (Spotify-style Infographic) ── */}
      <div className="card-ref s4 h-full" style={{ background: '#fff', border: '1px solid #f1f5f9' }}>
         <PaxProfitReferenceCard />
      </div>

      {/* ── Card 5: Operating Cost Breakdown (4-col donut) ── */}
      <div className="card-ref s4">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Allocation</div><div className="title m-0">Cost Breakdown</div></div>
         </div>
         <div className="chart-wrap flex-1" style={{minHeight: 160}}>
            <CostBreakdownPie />
         </div>
      </div>

      {/* ── Card 6: Cash Flow Liquidity (4-col VS card) ── */}
      <div className="card-ref s4">
         <div className="lbl">Liquidity Analytics</div>
         <div className="title mb4">Cash Flow Status</div>
         <PaymentStatus collected="$412,800" outstanding="$88,200" collectedPercent={82} />
      </div>

      {/* ── Card 7: High-Priority Invoices (8-col table) ── */}
      <div className="card-ref s8">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Receivables</div><div className="title m-0">High-Priority Invoices</div></div>
           <span style={{fontSize: 10, color: '#7c3aed', fontWeight: 700, cursor: 'pointer'}}>View Ledgers</span>
         </div>
         <PillarInvoicesList invoices={invoiceData} />
      </div>

      {/* ── Card 8: Contract Negotiation Yield (Segmented Gauge Style) ── */}
      <div className="card-ref s4 h-full" style={{ background: '#fff', border: '1px solid #f1f5f9' }}>
         <NegotiationYieldRefined 
            label="Negotiation Yield" 
            value="9.8%" 
            percent={68}
            subLabel="Yield performance index:"
         />
      </div>

      {/* ── Card 9: Monthly P&L Expense Structure (8-col grouped bars) ── */}
      <div className="card-ref s8">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Monthly P&L</div><div className="title m-0">Expense Structure</div></div>
           <div className="fx" style={{gap: 12}}>
             <span className="fx ac g4" style={{fontSize:9,color:'#555'}}><span className="sq" style={{background:'#7c3aed'}}></span>Revenue</span>
             <span className="fx ac g4" style={{fontSize:9,color:'#555'}}><span className="sq" style={{background:'#94a3b8'}}></span>OpEx</span>
             <span className="fx ac g4" style={{fontSize:9,color:'#555'}}><span className="sq" style={{background:'#10b981'}}></span>Profit</span>
           </div>
         </div>
         <div className="chart-wrap flex-1 min-h-[160px] -ml-2">
           <ExpenseStructureChart data={expenseData} />
         </div>
      </div>

      {/* ── Card 10: High Volatility Category — Park Fees (4-col, ECG wave) ── */}
      <div className="card-ref s4" style={{background: '#fff5f5', border: '1px solid #fee2e2', position: 'relative', overflow: 'hidden'}}>
         <div className="ico" style={{backgroundColor: '#ef4444'}}>
             <Activity size={14} color="#fff" strokeWidth={2.5}/>
         </div>
         <div className="lbl" style={{color: '#f87171'}}>High Volatility</div>
         <div className="num" style={{color: '#991b1b', fontSize: 22}}>Park Fees</div>
         <div className="sub" style={{color: '#f87171'}}>+22% unpredicted span</div>
         <div className="mt4"><span className="bdg dn" style={{background: '#fecaca', color: '#b91c1c'}}>▼ Monitor closely</span></div>
         
         {/* ECG/heartbeat-style volatility wave — reference Pulse card style */}
         <svg
           style={{ width: '100%', height: 32, marginTop: 8 }}
           viewBox={`0 0 ${volatilityWave.length * 14} 32`}
           fill="none"
           preserveAspectRatio="none"
         >
           <polyline
             points={volatilityWave.map((v, i) => `${i * 14},${28 - (v / 18) * 24}`).join(' ')}
             stroke="#ef4444"
             strokeWidth="2"
             fill="none"
             strokeLinecap="round"
             strokeLinejoin="round"
           />
         </svg>
         
         {/* Mini stats row */}
         <div className="fx jb mt4" style={{paddingTop: 4, borderTop: '1px solid #fee2e2'}}>
           <div className="fxc"><span className="lbl" style={{color:'#f87171', fontSize: 8}}>Min</span><span style={{fontSize:11,fontWeight:700,color:'#991b1b'}}>$120</span></div>
           <div className="fxc ac"><span className="lbl" style={{color:'#f87171', fontSize: 8}}>Avg</span><span style={{fontSize:11,fontWeight:700,color:'#991b1b'}}>$185</span></div>
           <div className="fxc" style={{alignItems: 'flex-end'}}><span className="lbl" style={{color:'#f87171', fontSize: 8}}>Max</span><span style={{fontSize:11,fontWeight:700,color:'#991b1b'}}>$260</span></div>
         </div>
      </div>
    </>
  );
}
