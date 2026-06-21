"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  doc,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  ProductionEntry,
  Employee,
  ProductionStage,
  StageId,
  STAGE_LABELS,
} from "@/types";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { ChartCard } from "@/components/ui/ChartCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { showToast } from "@/components/ui/Toast";
import { useCollectionQuery } from "@/hooks/use-firestore-query";
import { WorldPopulationAreaChart } from "@/components/charts/WorldPopulationAreaChart";
import { palette } from "@/components/charts";
import { ReportCard } from "@/components/reports/ReportCard";
import type { PeriodSelection } from "@/components/reports/PeriodSelector";

type TimeWindow = "today" | "week" | "month";
type ActiveTab = "employees" | "dates";

function getDateBounds(window: TimeWindow) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (window === "today") return { start: todayStr, end: todayStr };
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];
  if (window === "week") return { start: weekStartStr, end: todayStr };
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return { start: monthStartStr, end: todayStr };
}

async function getNextReceiptNumber(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
  const timeStr =
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `RCP-${dateStr}-${timeStr}${rand}`;
}

interface EmployeePayment {
  employeeId: string;
  employeeName: string;
  totalPieces: number;
  dueAmount: number;
  paidAmount: number;
  daysWorked: number;
  avgPerformance: number;
  dueEntries: ProductionEntry[];
}

interface DateSummary {
  date: string;
  workerCount: number;
  totalPieces: number;
  dueAmount: number;
  paidAmount: number;
  entries: ProductionEntry[];
}

export default function PaymentsPage() {
  const { userRole } = useAuth();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("today");
  const [activeTab, setActiveTab] = useState<ActiveTab>("employees");
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const [payEmployeeId, setPayEmployeeId] = useState<string | null>(null);
  const [payProcessing, setPayProcessing] = useState(false);

  const { data: employees = [] } = useCollectionQuery<Employee>("employees", [
    orderBy("name"),
  ], { staleTime: 10 * 60 * 1000 });

  useCollectionQuery<ProductionStage>("productionStages", [
    orderBy("stageId"),
  ], { staleTime: 10 * 60 * 1000 });

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "productionEntries"), orderBy("date", "desc"), limit(500)),
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionEntry)));
        setEntriesLoading(false);
      },
      (err) => { console.error("productionEntries listener error:", err); setEntriesLoading(false); }
    );
    return () => unsub();
  }, []);

  const { start, end } = getDateBounds(timeWindow);
  const filteredEntries = useMemo(() =>
    entries.filter((e) => e.date >= start && e.date <= end),
    [entries, start, end]
  );

  const supervisorDepartment = useMemo(() =>
    userRole?.role === "PRODUCTION_SUPERVISOR" && userRole?.employeeId
      ? employees.find((e) => e.id === userRole.employeeId)?.department ?? null
      : null,
    [userRole, employees]
  );

  const productionEmployees = useMemo(() =>
    employees.filter(
      (e) => (supervisorDepartment ? e.department === supervisorDepartment : e.department === "PRODUCTION") && e.isActive
    ),
    [employees, supervisorDepartment]
  );

  const employeePayments = useMemo(() => {
    const map = new Map<string, EmployeePayment>();
    productionEmployees.forEach((emp) => {
      const empEntries = filteredEntries.filter((e) => e.employeeId === emp.id);
      if (empEntries.length === 0) return;

      const dueEntries = empEntries.filter(
        (e) => !e.paymentStatus || e.paymentStatus === "due"
      );
      const paidEntries = empEntries.filter(
        (e) => e.paymentStatus === "paid"
      );

      map.set(emp.id, {
        employeeId: emp.id,
        employeeName: emp.name,
        totalPieces: empEntries.reduce((s, e) => s + e.actualPieces, 0),
        dueAmount: dueEntries.reduce((s, e) => s + e.earningsUgx, 0),
        paidAmount: paidEntries.reduce((s, e) => s + e.earningsUgx, 0),
        daysWorked: new Set(empEntries.map((e) => e.date)).size,
        avgPerformance: Math.round(
          empEntries.reduce((s, e) => s + e.performancePct, 0) / empEntries.length
        ),
        dueEntries: [...dueEntries].sort((a, b) => b.date.localeCompare(a.date)),
      });
    });
    return Array.from(map.values()).sort((a, b) => b.dueAmount - a.dueAmount);
  }, [productionEmployees, filteredEntries]);

  const dateSummaries = useMemo(() => {
    const map = new Map<string, DateSummary>();
    filteredEntries.forEach((e) => {
      const existing = map.get(e.date);
      if (existing) {
        existing.totalPieces += e.actualPieces;
        if (!e.paymentStatus || e.paymentStatus === "due") existing.dueAmount += e.earningsUgx;
        if (e.paymentStatus === "paid") existing.paidAmount += e.earningsUgx;
        existing.entries.push(e);
        existing.workerCount = new Set(existing.entries.map((x) => x.employeeId)).size;
      } else {
        map.set(e.date, {
          date: e.date,
          totalPieces: e.actualPieces,
          dueAmount: !e.paymentStatus || e.paymentStatus === "due" ? e.earningsUgx : 0,
          paidAmount: e.paymentStatus === "paid" ? e.earningsUgx : 0,
          workerCount: 1,
          entries: [e],
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredEntries]);

  const dailyPaymentData = useMemo(() =>
    [...dateSummaries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((ds) => ({
        date: ds.date,
        Due: ds.dueAmount,
        Paid: ds.paidAmount,
      })),
    [dateSummaries]
  );

  const totalDue = useMemo(() =>
    filteredEntries
      .filter((e) => !e.paymentStatus || e.paymentStatus === "due")
      .reduce((s, e) => s + e.earningsUgx, 0),
    [filteredEntries]
  );

  const totalPaid = useMemo(() =>
    filteredEntries
      .filter((e) => e.paymentStatus === "paid")
      .reduce((s, e) => s + e.earningsUgx, 0),
    [filteredEntries]
  );

  const totalPieces = useMemo(() =>
    filteredEntries.reduce((s, e) => s + e.actualPieces, 0),
    [filteredEntries]
  );

  const workerCount = useMemo(() =>
    new Set(filteredEntries.map((e) => e.employeeId)).size,
    [filteredEntries]
  );

  const paidRatio = useMemo(() => {
    const total = totalDue + totalPaid;
    return total > 0 ? Math.round((totalPaid / total) * 100) : 0;
  }, [totalDue, totalPaid]);

  const avgDailyEarning = useMemo(() => {
    const days = dateSummaries.length;
    return days > 0 ? Math.round((totalDue + totalPaid) / days) : 0;
  }, [totalDue, totalPaid, dateSummaries]);

  const topEarner = useMemo(() => {
    if (employeePayments.length === 0) return null;
    return [...employeePayments].sort(
      (a, b) => b.dueAmount + b.paidAmount - (a.dueAmount + a.paidAmount)
    )[0];
  }, [employeePayments]);

  const paymentTrendData = useMemo(() =>
    [...dateSummaries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((ds) => ({
        label: ds.date.slice(5),
        Due: ds.dueAmount,
        Paid: ds.paidAmount,
      })),
    [dateSummaries]
  );

  const windowDayCount = useMemo(() => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  }, [start, end]);

  const handleWindowChange = (tw: TimeWindow) => {
    setTimeWindow(tw);
    setExpandedDate(null);
  };

  const payEmployee = employeePayments.find((e) => e.employeeId === payEmployeeId);

  const handlePayConfirm = async () => {
    if (!payEmployee || payEmployee.dueEntries.length === 0) return;
    setPayProcessing(true);
    try {
      const receiptNumber = await getNextReceiptNumber();
      const todayStr = new Date().toISOString().split("T")[0];

      const batch = writeBatch(db);
      const paymentRef = doc(collection(db, "payments"));

      batch.set(paymentRef, {
        employeeId: payEmployee.employeeId,
        periodStart: start,
        periodEnd: end,
        totalAmount: payEmployee.dueAmount,
        status: "paid",
        paidDate: todayStr,
        receiptNumber,
        notes: "",
        createdAt: Timestamp.now(),
        createdBy: userRole?.uid ?? "",
      });

      payEmployee.dueEntries.forEach((entry) => {
        const entryRef = doc(db, "productionEntries", entry.id);
        batch.update(entryRef, {
          paymentStatus: "paid",
          paymentId: paymentRef.id,
        });
      });

      await batch.commit();

      showToast(
        `Payment of UGX ${payEmployee.dueAmount.toLocaleString()} to ${payEmployee.employeeName} — Receipt: ${receiptNumber}`,
        "success"
      );

      try {
        const { pdf } = await import("@react-pdf/renderer");
        const { PaymentReceiptPDF } = await import("@/components/payments/PaymentReceiptPDF");
        const blob = await pdf(
          <PaymentReceiptPDF
            receiptNumber={receiptNumber}
            employeeName={payEmployee.employeeName}
            employeeRole="WORKER — PRODUCTION"
            periodStart={start}
            periodEnd={end}
            paidDate={new Date().toISOString().split("T")[0]}
            entries={payEmployee.dueEntries.map((e) => ({
              date: e.date,
              stageId: e.stageId,
              actualPieces: e.actualPieces,
              earningsUgx: e.earningsUgx,
            }))}
            totalAmount={payEmployee.dueAmount}
          />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-${receiptNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch {
        showToast("Receipt PDF could not be generated, but the payment was recorded successfully.", "info");
      }

      setPayEmployeeId(null);
    } catch {
      showToast("Payment failed. Please try again.", "error");
    } finally {
      setPayProcessing(false);
    }
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.name : id;
  };

  const getStageLabel = (stageId: string) => {
    return STAGE_LABELS[stageId as StageId] ?? stageId;
  };

  const handleGenerateReport = useCallback(async (selection: PeriodSelection) => {
    const params = new URLSearchParams({
      screen: "payments",
      periodType: selection.type,
      startDate: selection.startDate,
      endDate: selection.endDate,
      periodLabel: selection.periodLabel,
    });
    const res = await fetch(`/api/reports?${params}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Report generation failed: ${res.status} ${body.replace(/<[^>]*>/g, "").slice(0, 200)}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-report-${selection.startDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (entriesLoading) {
    return <div className="text-center text-gray-400 py-12">Loading payments...</div>;
  }

  return (
    <RouteGuard>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["today", "week", "month"] as const).map((tw) => (
            <button
              key={tw}
              onClick={() => handleWindowChange(tw)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                timeWindow === tw ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              {tw === "today" ? "Today" : tw === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard title="Total Due" subtitle="Unpaid earnings" variant="gradient" accentColor={palette.orange}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-orange-500">UGX {totalDue.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mt-1">due for period</span>
          </div>
        </ChartCard>

        <ChartCard title="Total Paid" subtitle="Completed payments" variant="gradient" accentColor={palette.emerald}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-emerald-500">UGX {totalPaid.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mt-1">paid this period</span>
          </div>
        </ChartCard>

        <ChartCard title="Total Pieces" subtitle="All production output" variant="gradient" accentColor={palette.blue}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-blue-500">{totalPieces.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mt-1">pieces produced</span>
          </div>
        </ChartCard>

        <ChartCard title="Active Workers" subtitle="Unique employees" variant="gradient" accentColor={palette.violet}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-violet-500">{workerCount}</span>
            <span className="text-xs text-gray-400 mt-1">workers this period</span>
          </div>
        </ChartCard>

        <ChartCard title="Paid Ratio" subtitle="Percentage of earnings paid" variant="gradient" accentColor={paidRatio >= 80 ? palette.emerald : paidRatio >= 50 ? palette.yellow : palette.red}>
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke={paidRatio >= 80 ? palette.emerald : paidRatio >= 50 ? palette.yellow : palette.red} strokeWidth="3" strokeDasharray={`${paidRatio} ${100 - paidRatio}`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900">{paidRatio}%</span>
            </div>
            <span className="text-xs text-gray-400 mt-2">{totalPaid.toLocaleString()} of {(totalDue + totalPaid).toLocaleString()} UGX</span>
          </div>
        </ChartCard>

        <ChartCard title="Avg Daily Earning" subtitle="Per day average" variant="gradient" accentColor={palette.teal}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-teal-500">UGX {avgDailyEarning.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mt-1">avg across {dateSummaries.length} day{dateSummaries.length !== 1 ? "s" : ""}</span>
          </div>
        </ChartCard>

        {paymentTrendData.length > 0 && (
          <WorldPopulationAreaChart
            data={paymentTrendData}
            series={[
              { dataKey: "Due", name: "Due", color: palette.orange },
              { dataKey: "Paid", name: "Paid", color: palette.emerald },
            ]}
            title="Due vs Paid"
            subtitle="Daily comparison"
            height={260}
          />
        )}

        {topEarner ? (
          <ChartCard title="Top Earner" subtitle="Highest grossing worker" variant="gradient" accentColor={palette.yellow}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-xl font-bold text-gray-900">{topEarner.employeeName}</span>
              <span className="text-2xl font-bold text-yellow-500 mt-1">UGX {(topEarner.dueAmount + topEarner.paidAmount).toLocaleString()}</span>
              <span className="text-xs text-gray-400 mt-1">{topEarner.totalPieces.toLocaleString()} pieces | {topEarner.daysWorked} days</span>
            </div>
          </ChartCard>
        ) : (
          <ChartCard title="Top Earner" subtitle="Highest grossing worker" variant="gradient">
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>
          </ChartCard>
        )}

        <ChartCard title="Payment Summary" subtitle="Period breakdown" variant="gradient" accentColor={palette.slate}>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-700">Paid</span>
                <span className="text-emerald-500 font-semibold">
                  {totalDue + totalPaid > 0 ? Math.round((totalPaid / (totalDue + totalPaid)) * 100) : 0}%
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${totalDue + totalPaid > 0 ? (totalPaid / (totalDue + totalPaid)) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-700">Due</span>
                <span className="text-orange-500 font-semibold">
                  {totalDue + totalPaid > 0 ? Math.round((totalDue / (totalDue + totalPaid)) * 100) : 0}%
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${totalDue + totalPaid > 0 ? (totalDue / (totalDue + totalPaid)) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-gray-700">Workers with due</span>
                <span className="text-gray-500 font-semibold">{employeePayments.filter((e) => e.dueAmount > 0).length} / {employeePayments.length}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="font-semibold text-gray-700">Period days</span>
                <span className="text-gray-500 font-semibold">{windowDayCount}</span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      <ReportCard title="Payments Report" subtitle="Download a PDF summary of payment data" onGenerate={handleGenerateReport} />

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("employees")}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "employees"
              ? "text-gray-900 border-gray-900"
              : "text-gray-500 border-transparent hover:text-gray-700"
          }`}
        >
          By Employee
        </button>
        <button
          onClick={() => setActiveTab("dates")}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "dates"
              ? "text-gray-900 border-gray-900"
              : "text-gray-500 border-transparent hover:text-gray-700"
          }`}
        >
          By Date
        </button>
      </div>

      {activeTab === "employees" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          {employeePayments.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No production entries found for this period.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pieces</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg/Day</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perf.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employeePayments.map((emp, i) => (
                  <tr
                    key={emp.employeeId}
                    className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/payments/worker/${emp.employeeId}`}
                        className="text-sm font-medium text-stock-blue hover:underline"
                      >
                        {emp.employeeName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {emp.totalPieces.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-amber-600">
                      {emp.dueAmount > 0 ? `UGX ${emp.dueAmount.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-ugx">
                      {emp.paidAmount > 0 ? `UGX ${emp.paidAmount.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{emp.daysWorked}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      UGX {Math.round((emp.dueAmount + emp.paidAmount) / emp.daysWorked).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={emp.avgPerformance} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {emp.dueAmount > 0 ? (
                        <button
                          onClick={() => setPayEmployeeId(emp.employeeId)}
                          className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800"
                        >
                          Pay Due
                        </button>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">✓ Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "dates" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          {dateSummaries.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No production entries found for this period.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workers</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pieces</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dateSummaries.map((ds, i) => (
                  <React.Fragment key={ds.date}>
                    <tr
                      onClick={() =>
                        setExpandedDate(expandedDate === ds.date ? null : ds.date)
                      }
                      className={`cursor-pointer ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      } hover:bg-gray-100 transition-colors`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {ds.date}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {ds.workerCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {ds.totalPieces.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-amber-600">
                        {ds.dueAmount > 0 ? `UGX ${ds.dueAmount.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-ugx">
                        {ds.paidAmount > 0 ? `UGX ${ds.paidAmount.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {expandedDate === ds.date ? "▲" : "▼"}
                      </td>
                    </tr>
                    {expandedDate === ds.date && (
                      <tr key={`${ds.date}-detail`}>
                        <td colSpan={6} className="px-0 py-0">
                          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              Entries for {ds.date}
                            </h4>
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                  <th className="text-left pb-2 pr-4">Employee</th>
                                  <th className="text-left pb-2 pr-4">Stage</th>
                                  <th className="text-left pb-2 pr-4">Pieces</th>
                                  <th className="text-left pb-2 pr-4">Target</th>
                                  <th className="text-left pb-2 pr-4">Earnings</th>
                                  <th className="text-left pb-2 pr-4">Perf.</th>
                                  <th className="text-left pb-2 pr-4">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ds.entries.map((entry) => (
                                  <tr key={entry.id} className="border-b border-gray-200 last:border-0">
                                    <td className="py-2 pr-4 text-gray-700">
                                      {getEmployeeName(entry.employeeId)}
                                    </td>
                                    <td className="py-2 pr-4 text-gray-700">
                                      {getStageLabel(entry.stageId)}
                                    </td>
                                    <td className="py-2 pr-4 text-gray-900 font-medium">
                                      {entry.actualPieces}
                                    </td>
                                    <td className="py-2 pr-4 text-gray-500">
                                      {entry.targetPieces}
                                    </td>
                                    <td className="py-2 pr-4 text-ugx font-medium">
                                      UGX {entry.earningsUgx.toLocaleString()}
                                    </td>
                                    <td className="py-2 pr-4">
                                      <StatusBadge value={entry.performancePct} />
                                    </td>
                                    <td className="py-2 pr-4">
                                      <span
                                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                                          entry.paymentStatus === "paid"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-amber-100 text-amber-700"
                                        }`}
                                      >
                                        {entry.paymentStatus === "paid" ? "Paid" : "Due"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pay Due Modal */}
      {payEmployeeId && payEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Confirm Payment
                </h2>
                <p className="text-sm text-gray-500">
                  {payEmployee.employeeName} &mdash;{" "}
                  {timeWindow === "today" ? "Today" : timeWindow === "week" ? "This Week" : "This Month"}
                </p>
              </div>
              <button
                onClick={() => setPayEmployeeId(null)}
                className="text-gray-500 hover:text-gray-900"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-amber-800">Total Due Amount</span>
                  <span className="text-xl font-bold text-amber-800">
                    UGX {payEmployee.dueAmount.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  {payEmployee.dueEntries.length} entry{payEmployee.dueEntries.length !== 1 ? "ies" : "y"} to be paid
                </p>
              </div>

              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                    <th className="text-left pb-2 pr-4">Date</th>
                    <th className="text-left pb-2 pr-4">Stage</th>
                    <th className="text-left pb-2 pr-4">Pieces</th>
                    <th className="text-right pb-2 pr-4">Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {payEmployee.dueEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4 text-gray-700">{entry.date}</td>
                      <td className="py-2 pr-4 text-gray-700">
                        {getStageLabel(entry.stageId)}
                      </td>
                      <td className="py-2 pr-4 text-gray-900 font-medium">
                        {entry.actualPieces}
                      </td>
                      <td className="py-2 pr-4 text-ugx font-medium text-right">
                        UGX {entry.earningsUgx.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setPayEmployeeId(null)}
                disabled={payProcessing}
                className="py-2 px-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayConfirm}
                disabled={payProcessing}
                className="py-2 px-6 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
              >
                {payProcessing ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : (
                  `Pay UGX ${payEmployee.dueAmount.toLocaleString()}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RouteGuard>
  );
}
