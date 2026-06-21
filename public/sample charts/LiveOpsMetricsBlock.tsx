import React from 'react';
import { Activity, Truck, AlertTriangle, Cpu, Users, Car } from 'lucide-react';
import './ChartSetup';

import SafariMissionProgress from './SafariMissionProgress';
import FleetStatusGauge from './FleetStatusGauge';
import EmergencyProtocolsList from './EmergencyProtocolsList';
import SystemRadarChart from './SystemRadarChart';
import GuestStatusSplit from './GuestStatusSplit';
import IncidentTrendArea from './IncidentTrendArea';
import PillarLogisticsSchedule from './PillarLogisticsSchedule';
import LiveLogisticsTimeline from './LiveLogisticsTimeline';

const fleetData = [
  { name: 'Active', value: 24, color: '#2563eb' },
  { name: 'Service', value: 4,  color: '#cbd5e1' },
  { name: 'Standby', value: 2,  color: '#0f172a' },
];

const emergencyEvents = [
  { time: '4:20', date: 'Mar 18', description: 'Tire puncture - Vehicle KA-07', code: 'SOS-408', severity: 'critical' as const },
  { time: '3:41', date: 'Mar 18', description: 'Radio failure - Guide unit #3',  code: 'SYS-512', severity: 'warning' as const },
  { time: '2:13', date: 'Mar 17', description: 'Guest medical - Serengeti Gate', code: 'MED-404', severity: 'info'     as const },
];

const performanceData = {
  onTime: 88,
  delayed: 9,
  critical: 3,
};

const timelineData = [
  { route: 'Nairobi-Mara',    onTime: 85, delayed: 10, critical: 5 },
  { route: 'Mara-Serengeti',  onTime: 92, delayed: 5,  critical: 3 },
  { route: 'Arusha-Manyara',  onTime: 78, delayed: 15, critical: 7 },
];

const scheduleItems = [
  { id: '1', type: 'Departure', route: 'Kibo Palace Arusha',      time: '08:00 AM', status: 'Confirmed' as const },
  { id: '2', type: 'Transfer',  route: 'Mara Airstrip',           time: '11:45 AM', status: 'On Route'  as const },
  { id: '3', type: 'Check-in',  route: 'Serengeti Migration Camp', time: '14:30 PM', status: 'Pending'   as const },
];

const regionalGuestData = [
  { region: 'Serengeti North', count: 42, color: '#2563eb' },
  { region: 'Maasai Mara',    count: 38, color: '#3b82f6' },
  { region: 'Amboseli NP',    count: 24, color: '#60a5fa' },
  { region: 'Ngorongoro',     count: 20, color: '#93c5fd' },
];

export default function LiveOpsMetricsBlock() {
  return (
    <>
      {/* Card 1: Live Mission Progress — Transactions sparkline clone */}
      <div className="card-ref s4 bg-white border border-slate-100 shadow-sm">
        <div className="fx jb ac mb-4">
          <div className="fxc">
            <div className="lbl m-0 text-slate-500">Live Mission Progress</div>
            <div className="num text-slate-900 mt-1" style={{ fontSize: 13 }}>Weekly Analytics</div>
          </div>
          <div className="ico" style={{ background: 'rgba(37,99,235,0.12)' }}>
            <Activity size={16} color="#2563eb" />
          </div>
        </div>
        <SafariMissionProgress />
      </div>

      {/* Card 2: Assets — donut clone of Sessions by devices */}
      <div className="card-ref s4">
        <div className="fx jb ac mb4">
          <div>
            <div className="lbl" style={{ margin: 0 }}>Assets</div>
            <div className="title m-0">Fleet Status</div>
          </div>
          <Truck size={14} className="text-blue-500" />
        </div>
        <FleetStatusGauge data={fleetData} />
      </div>

      {/* Card 3: Emergency Protocols — My cases clone */}
      <div className="card-ref s4">
        <div className="fx ac g4 mb-2">
          <div className="ico" style={{ backgroundColor: '#2563eb', width: 24, height: 24 }}>
            <AlertTriangle size={12} color="#fff" strokeWidth={2.2} />
          </div>
          <div className="lbl m-0 text-slate-500">Emergency Protocols</div>
        </div>
        <EmergencyProtocolsList events={emergencyEvents} activeCount={1} />
      </div>

      {/* Card 4: System Performance — Management bar strip clone, 6-col */}
      <div className="card-ref s6">
        <div className="fx jb ac mb4">
          <div>
            <div className="lbl" style={{ margin: 0 }}>System</div>
            <div className="title m-0">Logistics Performance Strip</div>
          </div>
          <Cpu size={14} className="text-blue-500" />
        </div>
        <SystemRadarChart performance={performanceData} />
      </div>

      {/* Card 5: Route Performance Timeline — unchanged */}
      <div className="card-ref s6">
        <div className="fx jb ac mb4">
          <div>
            <div className="lbl" style={{ margin: 0 }}>Logistics</div>
            <div className="title m-0">Route Performance Timeline</div>
          </div>
        </div>
        <LiveLogisticsTimeline data={timelineData} />
      </div>

      {/* Card 6: Active Guests (Field) — breakdown bars inspired by Avg. Energy Activity */}
      <div className="card-ref s3">
        <div className="fx ac g4 mb-1">
          <Users size={12} className="text-blue-500" />
          <div className="lbl m-0 text-blue-500">Active Guests (Field)</div>
        </div>
        <GuestStatusSplit 
          fieldGuests={124} 
          vehicleCount={28} 
          baseGuests={42} 
          regions={regionalGuestData} 
        />
      </div>

      {/* Card 7: Vehicle Incident Track — Area nodes inspired by Transactions */}
      <div className="card-ref s3">
        <div className="fx jb ac mb-2">
          <div>
            <div className="lbl m-0">Vehicle Incident Track</div>
            <div className="num mt-1" style={{ fontSize: 11, color: '#94a3b8' }}>Rolling Trend</div>
          </div>
          <Car size={14} className="text-slate-400" />
        </div>
        <IncidentTrendArea />
      </div>

      {/* Card 8: Movement Schedule — timeline */}
      <div className="card-ref s6">
        <div className="fx jb ac mb4">
          <div>
            <div className="lbl" style={{ margin: 0 }}>Timeline</div>
            <div className="title m-0">Operational Movement Schedule</div>
          </div>
        </div>
        <PillarLogisticsSchedule items={scheduleItems} />
      </div>
    </>
  );
}
