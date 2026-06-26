"use client";

import { useState, useMemo } from "react";
import { ChartCard } from "@/components/ui/ChartCard";
import { palette } from "@/components/charts";
import { computePayeeTax, getPayeeBracket } from "@/lib/deductions";

interface PayeeEmployeeData {
  employeeName: string;
  employeeId: string;
  grossAmount: number;
  payeeTax: number;
  bracketLabel: string;
  bracketRate: number;
  isTaxFree: boolean;
}

interface PayeeCardProps {
  employeePayments: {
    employeeId: string;
    employeeName: string;
    dueAmount: number;
    paidAmount: number;
  }[];
}

export function PayeeCard({ employeePayments }: PayeeCardProps) {
  const [expanded, setExpanded] = useState(false);

  const payeeData = useMemo(() => {
    return employeePayments
      .filter((ep) => ep.dueAmount + ep.paidAmount > 0)
      .map((ep) => {
        const gross = ep.dueAmount + ep.paidAmount;
        const tax = computePayeeTax(gross);
        const bracket = getPayeeBracket(gross);
        return {
          employeeName: ep.employeeName,
          employeeId: ep.employeeId,
          grossAmount: gross,
          payeeTax: tax,
          bracketLabel: bracket.label,
          bracketRate: bracket.rate,
          isTaxFree: bracket.rate === 0,
        };
      });
  }, [employeePayments]);

  const totalPayee = useMemo(
    () => payeeData.reduce((s, d) => s + d.payeeTax, 0),
    [payeeData]
  );

  const taxFreeCount = useMemo(
    () => payeeData.filter((d) => d.isTaxFree).length,
    [payeeData]
  );

  const taxableCount = useMemo(
    () => payeeData.length - taxFreeCount,
    [payeeData, taxFreeCount]
  );

  return (
    <ChartCard
      title="PAYEE"
      subtitle="Pay As You Earn"
      variant="gradient"
      accentColor={palette.orange}
      headerDivider={false}
      action={
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1"
        >
          {expanded ? "Hide Details" : "Show Details"}
          <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
        </button>
      }
    >
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-xs text-orange-600 font-medium">Total PAYEE</div>
            <div className="text-lg font-bold text-orange-700">
              UGX {totalPayee.toLocaleString()}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 font-medium">Taxable</div>
            <div className="text-lg font-bold text-gray-700">{taxableCount}</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xs text-green-600 font-medium">Tax Free</div>
            <div className="text-lg font-bold text-green-700">{taxFreeCount}</div>
          </div>
        </div>

        {expanded && (
          <div className="mt-2 border-t border-gray-100 pt-3">
            <div className="max-h-48 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-1 pr-2">Employee</th>
                    <th className="pb-1 pr-2 text-right">Gross (UGX)</th>
                    <th className="pb-1 pr-2 text-right">Bracket</th>
                    <th className="pb-1 pr-2 text-right">Rate</th>
                    <th className="pb-1 pr-2 text-right">PAYEE (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  {payeeData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="pt-2 text-center text-gray-400">
                        No data for this period.
                      </td>
                    </tr>
                  ) : (
                    payeeData.map((d) => (
                      <tr key={d.employeeId} className="border-b border-gray-100">
                        <td className="py-1.5 pr-2 text-gray-700">{d.employeeName}</td>
                        <td className="py-1.5 pr-2 text-right text-gray-700">
                          {d.grossAmount.toLocaleString()}
                        </td>
                        <td className="py-1.5 pr-2 text-right text-gray-500">
                          {d.bracketLabel}
                        </td>
                        <td className="py-1.5 pr-2 text-right">
                          {d.isTaxFree ? (
                            <span className="text-green-600 font-medium">Tax Free</span>
                          ) : (
                            <span className="text-gray-700">{d.bracketRate}%</span>
                          )}
                        </td>
                        <td className={`py-1.5 pr-2 text-right font-medium ${
                          d.isTaxFree ? "text-green-600" : "text-red-600"
                        }`}>
                          {d.isTaxFree ? "0" : d.payeeTax.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300 font-semibold">
                    <td className="pt-1.5 pr-2 text-gray-900">Total</td>
                    <td className="pt-1.5 pr-2 text-right text-gray-900">
                      {payeeData.reduce((s, d) => s + d.grossAmount, 0).toLocaleString()}
                    </td>
                    <td colSpan={2} />
                    <td className="pt-1.5 pr-2 text-right text-red-700">
                      {totalPayee.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
