"use client";

import { useMemo, useState } from "react";
import { ChartCard } from "@/components/ui/ChartCard";
import { palette } from "@/components/charts";
import type { Employee, Payment } from "@/types";

export function PayeeCard({ payments, employees }: { payments: Payment[]; employees: Employee[] }) {
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => {
    const byEmployee = new Map<string, { id: string; name: string; gross: number; paye: number; net: number }>();
    for (const payment of payments) {
      const previous = byEmployee.get(payment.employeeId) ?? {
        id: payment.employeeId,
        name: employees.find(employee => employee.id === payment.employeeId)?.name ?? payment.employeeId,
        gross: 0, paye: 0, net: 0,
      };
      const gross = payment.grossAmount ?? payment.totalAmount ?? payment.amountUgx ?? 0;
      const paye = payment.payeeTax ?? 0;
      previous.gross += gross;
      previous.paye += paye;
      previous.net += payment.netPayAmount ?? (gross - (payment.nssfEmployeeDeduction ?? 0) - paye);
      byEmployee.set(payment.employeeId, previous);
    }
    return [...byEmployee.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [payments, employees]);
  const total = rows.reduce((sum, row) => sum + row.paye, 0);

  return <ChartCard title="PAYE" subtitle="Confirmed deductions in the selected period" variant="gradient" accentColor={palette.orange} headerDivider={false}
    action={<button type="button" onClick={() => setExpanded(!expanded)} className="text-xs text-gray-500 hover:text-gray-900 font-medium">{expanded ? "Hide Details ▲" : "Show Details ▼"}</button>}>
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-3 bg-orange-50 rounded-lg"><div className="text-xs text-orange-600 font-medium">Total PAYE</div><div className="text-lg font-bold text-orange-700">UGX {total.toLocaleString()}</div></div>
        <div className="text-center p-3 bg-gray-50 rounded-lg"><div className="text-xs text-gray-500 font-medium">Employees paid</div><div className="text-lg font-bold text-gray-700">{rows.length}</div></div>
        <div className="text-center p-3 bg-green-50 rounded-lg"><div className="text-xs text-green-600 font-medium">No PAYE withheld</div><div className="text-lg font-bold text-green-700">{rows.filter(row => row.paye === 0).length}</div></div>
      </div>
      {expanded && <div className="overflow-x-auto max-h-48 overflow-y-auto border-t pt-3"><table className="min-w-full text-xs"><thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Employee</th><th className="pb-2 text-right">Gross</th><th className="pb-2 text-right">PAYE</th><th className="pb-2 text-right">Net</th></tr></thead><tbody>{rows.length ? rows.map(row => <tr key={row.id} className="border-b"><td className="py-2">{row.name}</td><td className="py-2 text-right">{row.gross.toLocaleString()}</td><td className="py-2 text-right">{row.paye.toLocaleString()}</td><td className="py-2 text-right">{row.net.toLocaleString()}</td></tr>) : <tr><td colSpan={4} className="py-3 text-center text-gray-400">No confirmed payments for this period.</td></tr>}</tbody></table></div>}
    </div>
  </ChartCard>;
}
