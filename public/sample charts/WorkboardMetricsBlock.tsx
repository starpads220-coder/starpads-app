import React from 'react';
import { Layout, Zap, Clock, Users } from 'lucide-react';
import './ChartSetup';

import TaskProgressDonut from './TaskProgressDonut';
import ProductivityTrendArea from './ProductivityTrendArea';
import GoalCompletionDual from './GoalCompletionDual';
import WeeklyTimeDistribution from './WeeklyTimeDistribution';
import AgentActivityList from './AgentActivityList';

const taskData = [
  { name: 'Completed', value: 45, color: '#10b981' },
  { name: 'In Progress', value: 22, color: '#3b82f6' },
  { name: 'Pending', value: 18, color: '#f59e0b' },
  { name: 'Overdue', value: 5, color: '#ef4444' },
];

const productivityData = [
  { week: 'W1', volume: 420 },
  { week: 'W2', volume: 510 },
  { week: 'W3', volume: 480 },
  { week: 'W4', volume: 620 },
  { week: 'W5', volume: 550 },
];

const timeDistData = [
  { name: 'Mon', value: 42, color: '#3b82f6' },
  { name: 'Tue', value: 38, color: '#3b82f6' },
  { name: 'Wed', value: 52, color: '#3b82f6' },
  { name: 'Thu', value: 48, color: '#3b82f6' },
  { name: 'Fri', value: 45, color: '#3b82f6' },
];

const agentsData = [
  { id: '1', name: 'Sarah Taylor', role: 'Senior Agent', status: 'Online' as const, lastSeen: 'Active now' },
  { id: '2', name: 'Mike Kibaki', role: 'Logistics', status: 'Away' as const, lastSeen: '14m ago' },
  { id: '3', name: 'Jane Lock', role: 'Support', status: 'Offline' as const, lastSeen: '2h ago' },
];

export default function WorkboardMetricsBlock() {
  return (
    <>
      <div className="card-ref s4 bg-slate-50 border-slate-200">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Workload</div><div className="title m-0">Task Distribution Status</div></div>
           <Layout size={14} className="text-slate-500" />
         </div>
         <TaskProgressDonut data={taskData} />
      </div>

      <div className="card-ref s4">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Throughput</div><div className="title m-0">Productivity Velocity</div></div>
           <Zap size={14} className="text-orange-500" />
         </div>
         <ProductivityTrendArea data={productivityData} />
         <div className="sub mt-2 text-center text-[9px] font-bold text-slate-400">Task completion volume trend</div>
      </div>

      <div className="card-ref s4 flex flex-col items-center">
         <div className="title mb-1">Signal Goal Alignment</div>
         <GoalCompletionDual signalCompletion={82} additionalCompletion={64} />
      </div>

      <div className="card-ref s6">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Time Tracking</div><div className="title m-0">Weekly Workload Intensity</div></div>
           <Clock size={14} className="text-blue-500" />
         </div>
         <WeeklyTimeDistribution data={timeDistData} />
      </div>

      <div className="card-ref s6">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Live Status</div><div className="title m-0">Team Collaboration Pulse</div></div>
           <Users size={14} className="text-slate-500" />
         </div>
         <AgentActivityList agents={agentsData} />
      </div>

      <div className="card-ref s2 bg-emerald-50/50 border border-emerald-100/50">
         <div className="lbl">Avg Response Time</div>
         <div className="num mt-1" style={{color: '#065f46'}}>14m</div>
         <div className="sub mt-1"><span className="bdg up py-0">-22% vs Q3</span></div>
      </div>

      <div className="card-ref s2">
         <div className="lbl">System Utilization</div>
         <div className="num mt-1">92%</div>
         <div className="sub">Peak concurrent users</div>
      </div>
    </>
  );
}
