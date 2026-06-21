"use client";

import React from 'react';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = ['8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm'];

const BookingHeatmap = () => {
    const [data, setData] = React.useState<number[]>([]);

    React.useEffect(() => {
        // Generating mock data only on client
        setData(Array.from({ length: 7 * 7 }, () => Math.floor(Math.random() * 100)));
    }, []);

    if (data.length === 0) {
        return <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Loading heatmap...</div>;
    }

    return (
        <div style={{ width: '100%', padding: '0px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '3px' }}>
                <div /> 
                {hours.map(h => (
                    <div key={h} style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textAlign: 'center' }}>{h}</div>
                ))}

                {days.map((day, dIdx) => (
                    <React.Fragment key={day}>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center' }}>{day}</div>
                        {hours.map((_, hIdx) => {
                            const intensity = data[dIdx * 7 + hIdx];
                            const opacity = intensity / 100;
                            return (
                                <div
                                    key={`${day}-${hIdx}`}
                                    style={{
                                        height: '22px',
                                        borderRadius: '3px',
                                        backgroundColor: `rgba(37, 99, 235, ${0.05 + opacity * 0.95})`,
                                        border: '1px solid rgba(0,0,0,0.02)',
                                        transition: 'transform 0.2s, background-color 0.2s',
                                        cursor: 'pointer'
                                    }}
                                    title={`Intensity: ${intensity}%`}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.zIndex = '10'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '1'; }}
                                />
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Quiet</span>
                <div style={{ width: '40px', height: '6px', background: 'linear-gradient(to right, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 1))', borderRadius: '3px' }} />
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Peak</span>
            </div>
        </div>
    );
};

export default BookingHeatmap;
