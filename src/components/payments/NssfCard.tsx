"use client";

import { useState, useMemo } from "react";
import { ChartCard } from "@/components/ui/ChartCard";
import { palette } from "@/components/charts";
import { computeNssfEmployee, computeNssfBusiness } from "@/lib/deductions";

interface NssfEmployeeData {
  employeeName: string;
  employeeId: string;
  grossAmount: number;
  employeeDeduction: number;
  businessContribution: number;
}

interface NssfCardProps {
  employeePayments: {
    employeeId: string;
    employeeName: string;
    dueAmount: number;
    paidAmount: number;
  }[];
}

type NssfTab = "employee" | "business";

export function NssfCard({ employeePayments }: NssfCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [subTab, setSubTab] = useState<NssfTab>("employee");

  const nssfData = useMemo(() => {
    return employeePayments
      .filter((ep) => ep.dueAmount + ep.paidAmount > 0)
      .map((ep) => {
        const gross = ep.dueAmount + ep.paidAmount;
        return {
          employeeName: ep.employeeName,
          employeeId: ep.employeeId,
          grossAmount: gross,
          employeeDeduction: computeNssfEmployee(gross),
          businessContribution: computeNssfBusiness(gross),
        };
      });
  }, [employeePayments]);

  const totalEmployeeDeductions = useMemo(
    () => nssfData.reduce((s, d) => s + d.employeeDeduction, 0),
    [nssfData]
  );

  const totalBusinessContributions = useMemo(
    () => nssfData.reduce((s, d) => s + d.businessContribution, 0),
    [nssfData]
  );

  const totalGross = useMemo(
    () => nssfData.reduce((s, d) => s + d.grossAmount, 0),
    [nssfData]
  );

  return (
    <ChartCard
      title="NSSF"
      subtitle="National Social Security Fund"
      variant="gradient"
      accentColor={palette.blue}
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
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-xs text-red-600 font-medium">Employee (5%)</div>
            <div className="text-lg font-bold text-red-700">
              UGX {totalEmployeeDeductions.toLocaleString()}
            </div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 font-medium">Business (10%)</div>
            <div className="text-lg font-bold text-blue-700">
              UGX {totalBusinessContributions.toLocaleString()}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-2 border-t border-gray-100 pt-3">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSubTab("employee")}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  subTab === "employee"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Employee (5%)
              </button>
              <button
                onClick={() => setSubTab("business")}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  subTab === "business"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Business (10%)
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-1 pr-2">Employee</th>
                    <th className="pb-1 pr-2 text-right">Gross (UGX)</th>
                    {subTab === "employee" ? (
                      <th className="pb-1 pr-2 text-right">Deduction (5%)</th>
                    ) : (
                      <th className="pb-1 pr-2 text-right">Contribution (10%)</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {nssfData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="pt-2 text-center text-gray-400">
                        No data for this period.
                      </td>
                    </tr>
                  ) : (
                    nssfData.map((d) => (
                      <tr key={d.employeeId} className="border-b border-gray-100">
                        <td className="py-1.5 pr-2 text-gray-700">{d.employeeName}</td>
                        <td className="py-1.5 pr-2 text-right text-gray-700">
                          {d.grossAmount.toLocaleString()}
                        </td>
                        <td className={`py-1.5 pr-2 text-right font-medium ${
                          subTab === "employee" ? "text-red-600" : "text-blue-600"
                        }`}>
                          {subTab === "employee"
                            ? d.employeeDeduction.toLocaleString()
                            : d.businessContribution.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300 font-semibold">
                    <td className="pt-1.5 pr-2 text-gray-900">Total</td>
                    <td className="pt-1.5 pr-2 text-right text-gray-900">
                      {totalGross.toLocaleString()}
                    </td>
                    <td className={`pt-1.5 pr-2 text-right ${
                      subTab === "employee" ? "text-red-700" : "text-blue-700"
                    }`}>
                      {subTab === "employee"
                        ? totalEmployeeDeductions.toLocaleString()
                        : totalBusinessContributions.toLocaleString()}
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
