import React from 'react';

interface TripDurationProps {
  data: { days: string; count: number }[];
  maxCount: number;
}

const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function TripDurationBar({ data, maxCount }: TripDurationProps) {
  return (
    <div className="flex flex-col gap-1 mt-2">
      {data.map((d, i) => (
        <div key={d.days} className="srow2">
          <div className="title" style={{margin: 0, width: '65px', fontSize: '9px'}}>{d.days}</div>
          <div className="prog-track" style={{flex: 1}}>
            <div className="prog-fill" style={{ width: `${(d.count / maxCount) * 100}%`, background: colors[i % colors.length] }}></div>
          </div>
          <div className="num-sm" style={{width: '24px', textAlign: 'right'}}>{d.count}</div>
        </div>
      ))}
    </div>
  );
}
