"use client";

import React from 'react';

interface Invoice {
  id: string;
  customer: string;
  amount: string;
  status: 'Paid' | 'Pending' | 'Late';
  date: string;
}

interface PillarInvoicesListProps {
  invoices: Invoice[];
}

const statusConfig = {
  Paid:    { bg: '#dcfce7', color: '#16a34a', icon: '✓' },
  Pending: { bg: '#f1f5f9', color: '#64748b', icon: '⏳' },
  Late:    { bg: '#fee2e2', color: '#dc2626', icon: '!' },
};

const avatarColors = ['#7c3aed', '#0ea5e9', '#f43f5e', '#10b981', '#f59e0b'];

export default function PillarInvoicesList({ invoices }: PillarInvoicesListProps) {
  return (
    <div>
      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 0 6px 0', borderBottom: '1px solid #f1f5f9',
        fontSize: 9, color: '#94a3b8', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: 1,
      }}>
        <span>Invoice</span>
        <span>Amount</span>
      </div>

      {/* Invoice rows — reference Sales Top style */}
      {invoices.map((inv, i) => {
        const initials = inv.customer.split(' ').map(w => w[0]).join('').slice(0, 2);
        const sc = statusConfig[inv.status];
        
        return (
          <div key={inv.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 0', borderBottom: '1px solid #f8f9fa',
          }}>
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: avatarColors[i % avatarColors.length],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{inv.customer}</span>
              <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 500 }}>{inv.id} · {inv.date}</span>
            </div>

            {/* Status badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 9, fontWeight: 700, padding: '3px 8px',
              borderRadius: 20, background: sc.bg, color: sc.color,
            }}>
              {sc.icon} {inv.status}
            </span>

            {/* Amount */}
            <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', minWidth: 55, textAlign: 'right' as const }}>
              {inv.amount}
            </span>
          </div>
        );
      })}
    </div>
  );
}
