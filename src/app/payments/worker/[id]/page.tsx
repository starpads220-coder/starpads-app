"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ProductionEntry,
  Employee,
  Payment,
  StageId,
  STAGE_LABELS,
} from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { showToast } from "@/components/ui/Toast";
import { ChartCard } from "@/components/ui/ChartCard";
import { SingleDonutChart } from "@/components/charts/SingleDonutChart";
import { ScreenReadersBarChart } from "@/components/charts/ScreenReadersBarChart";
import { TransactionValueChart } from "@/components/charts/TransactionValueChart";
import { palette, formatCurrency } from "@/components/charts";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { ReportCard } from "@/components/reports/ReportCard";
import type { PeriodSelection } from "@/components/reports/PeriodSelector";
import { getPayeeBracket, computeNssfEmployee, computeNssfBusiness, computePayeeTax } from "@/lib/deductions";

type TimeWindow = "today" | "week" | "month" | "12months" | "custom";
type DetailTab = "calendar" | "breakdown" | "history" | "nssf" | "payee";

function getDateBounds(window: TimeWindow, customStart?: string, customEnd?: string) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (window === "today") return { start: todayStr, end: todayStr };
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];
  if (window === "week") return { start: weekStartStr, end: todayStr };
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  if (window === "month") return { start: monthStartStr, end: todayStr };
  if (window === "12months") {
    const yearAgo = new Date(now);
    yearAgo.setFullYear(now.getFullYear() - 1);
    return { start: yearAgo.toISOString().split("T")[0], end: todayStr };
  }
  return { start: customStart || todayStr, end: customEnd || todayStr };
}

export default function EmployeePaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [timeWindow, setTimeWindow] = useState<TimeWindow>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeTab, setActiveTab] = useState<DetailTab>("calendar");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    getDoc(doc(db, "employees", id)).then((snap) => {
      if (snap.exists()) {
        setEmployee({ id: snap.id, ...snap.data() } as Employee);
      }
    });

    const unsub1 = onSnapshot(
      query(
        collection(db, "productionEntries"),
        where("employeeId", "==", id),
        orderBy("date", "desc"),
        limit(200)
      ),
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionEntry)));
        setLoading(false);
      },
      (err) => { console.error("productionEntries listener error:", err); setLoading(false); }
    );

    const unsub2 = onSnapshot(
      query(
        collection(db, "payments"),
        where("employeeId", "==", id),
        orderBy("paidDate", "desc"),
        limit(100)
      ),
      (snap) => {
        setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)));
      },
      (err) => { console.error("payments listener error:", err); }
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [id]);

  const { start, end } = useMemo(
    () => getDateBounds(timeWindow, customStart || undefined, customEnd || undefined),
    [timeWindow, customStart, customEnd]
  );

  const filteredEntries = useMemo(() =>
    entries.filter((e) => e.date >= start && e.date <= end),
    [entries, start, end]
  );

  const filteredPayments = useMemo(() =>
    payments.filter((p) => p.paidDate && p.paidDate >= start && p.paidDate <= end),
    [payments, start, end]
  );

  const dueEntries = useMemo(() =>
    filteredEntries.filter((e) => !e.paymentStatus || e.paymentStatus === "due"),
    [filteredEntries]
  );

  const paidEntries = useMemo(() =>
    filteredEntries.filter((e) => e.paymentStatus === "paid"),
    [filteredEntries]
  );

  const dueAmount = useMemo(() =>
    dueEntries.reduce((s, e) => s + e.earningsUgx, 0),
    [dueEntries]
  );

  const paidAmount = useMemo(() =>
    paidEntries.reduce((s, e) => s + e.earningsUgx, 0),
    [paidEntries]
  );

  const totalPieces = useMemo(() =>
    filteredEntries.reduce((s, e) => s + e.actualPieces, 0),
    [filteredEntries]
  );

  const daysWorked = useMemo(() =>
    new Set(filteredEntries.map((e) => e.date)).size,
    [filteredEntries]
  );

  const avgPerDay = useMemo(() =>
    daysWorked > 0 ? Math.round(totalPieces / daysWorked) : 0,
    [daysWorked, totalPieces]
  );

  const totalTarget = useMemo(() =>
    filteredEntries.reduce((s, e) => s + e.targetPieces, 0),
    [filteredEntries]
  );

  const periodPerf = useMemo(() =>
    totalTarget > 0 ? Math.round((totalPieces / totalTarget) * 100) : 0,
    [totalPieces, totalTarget]
  );

  const stageData = useMemo(() => {
    const stageMap: Record<string, number> = {};
    filteredEntries.forEach((e) => {
      const sid = e.stageId as StageId;
      const label = STAGE_LABELS[sid] || sid;
      stageMap[label] = (stageMap[label] || 0) + e.actualPieces;
    });
    return Object.entries(stageMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredEntries]);

  const earningsTrendData = useMemo(() => {
    const grouped: Record<string, number> = {};
    paidEntries.forEach((e) => { grouped[e.date] = (grouped[e.date] || 0) + e.earningsUgx; });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));
  }, [paidEntries]);

  const dueTrendData = useMemo(() => {
    const grouped: Record<string, number> = {};
    dueEntries.forEach((e) => { grouped[e.date] = (grouped[e.date] || 0) + e.earningsUgx; });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));
  }, [dueEntries]);

  const perfColor = periodPerf >= 100 ? palette.emerald : periodPerf >= 70 ? palette.yellow : palette.red;

  const dayEntries = useMemo(() =>
    entries.filter((e) => e.date === selectedDate),
    [entries, selectedDate]
  );

  const dayDue = useMemo(() =>
    dayEntries.filter((e) => !e.paymentStatus || e.paymentStatus === "due"),
    [dayEntries]
  );

  const dayPaid = useMemo(() =>
    dayEntries.filter((e) => e.paymentStatus === "paid"),
    [dayEntries]
  );

  const { monthStart, days, entryDates } = useMemo(() => {
    const mStart = startOfMonth(calendarDate);
    const mEnd = endOfMonth(calendarDate);
    const cStart = new Date(mStart);
    cStart.setDate(cStart.getDate() - cStart.getDay());
    const cEnd = new Date(mEnd);
    if (cEnd.getDay() !== 6) cEnd.setDate(cEnd.getDate() + (6 - cEnd.getDay()));
    const dayList = eachDayOfInterval({ start: cStart, end: cEnd });
    const eDates = new Set(entries.map((e) => e.date));
    return { monthStart: mStart, days: dayList, entryDates: eDates };
  }, [calendarDate, entries]);

  const nssfSummary = useMemo(() => {
    const gross = dueAmount + paidAmount;
    const totalEmployeeDeduction = computeNssfEmployee(gross);
    const totalBusinessContribution = computeNssfBusiness(gross);
    const hasNssf = gross > 0;
    return { totalEmployeeDeduction, totalBusinessContribution, gross, hasNssf };
  }, [dueAmount, paidAmount]);

  const payeeSummary = useMemo(() => {
    const gross = dueAmount + paidAmount;
    const totalPayee = computePayeeTax(gross);
    const bracket = getPayeeBracket(gross);
    const isTaxFree = bracket.rate === 0;
    const taxableCount = isTaxFree ? 0 : 1;
    const taxFreeCount = isTaxFree ? 1 : 0;
    return { totalPayee, taxableCount, taxFreeCount, gross, hasPayee: totalPayee > 0, bracketLabel: bracket.label, bracketRate: bracket.rate };
  }, [dueAmount, paidAmount]);

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment) throw new Error("Payment not found");

      const receiptEntries = entries
        .filter((e) => e.paymentId === paymentId)
        .map((e) => ({
          date: e.date,
          stageId: e.stageId,
          actualPieces: e.actualPieces,
          earningsUgx: e.earningsUgx,
        }));

      const gross = payment.grossAmount || payment.totalAmount || 0;
      const nssfEmp = payment.nssfEmployeeDeduction || 0;
      const nssfBus = payment.nssfBusinessContribution || 0;
      const payee = payment.payeeTax || 0;
      const netPay = payment.netPayAmount || (gross - nssfEmp - payee);

      const { pdf } = await import("@react-pdf/renderer");
      const { PaymentReceiptPDF } = await import("@/components/payments/PaymentReceiptPDF");
      const blob = await pdf(
        <PaymentReceiptPDF
          receiptNumber={payment.receiptNumber || paymentId}
          employeeName={employee?.name || payment.employeeId}
          employeeRole={employee ? employee.role.replace(/_/g, " ") : ""}
          periodStart={payment.periodStart}
          periodEnd={payment.periodEnd}
          paidDate={payment.paidDate || ""}
          entries={receiptEntries}
          grossAmount={gross}
          nssfEmployeeDeduction={nssfEmp}
          nssfBusinessContribution={nssfBus}
          payeeTax={payee}
          netPayAmount={netPay}
          totalAmount={gross}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${payment.receiptNumber || paymentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Receipt downloaded successfully", "success");
    } catch {
      showToast("Failed to generate receipt. Please try again.", "error");
    }
  };

  const handleGenerateReport = useCallback(async (selection: PeriodSelection) => {
    const params = new URLSearchParams({
      screen: "worker",
      periodType: selection.type,
      startDate: selection.startDate,
      endDate: selection.endDate,
      periodLabel: selection.periodLabel,
      employeeId: id,
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
    a.download = `worker-report-${selection.startDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [id]);

  const handleGenerateNssfReport = useCallback(async (selection: PeriodSelection) => {
    const params = new URLSearchParams({
      screen: "nssf",
      periodType: selection.type,
      startDate: selection.startDate,
      endDate: selection.endDate,
      periodLabel: selection.periodLabel,
      employeeId: id,
    });
    const res = await fetch(`/api/reports?${params}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`NSSF report generation failed: ${res.status} ${body.replace(/<[^>]*>/g, "").slice(0, 200)}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nssf-employee-report-${selection.startDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [id]);

  const handleGeneratePayeeReport = useCallback(async (selection: PeriodSelection) => {
    const params = new URLSearchParams({
      screen: "payee",
      periodType: selection.type,
      startDate: selection.startDate,
      endDate: selection.endDate,
      periodLabel: selection.periodLabel,
      employeeId: id,
    });
    const res = await fetch(`/api/reports?${params}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`PAYEE report generation failed: ${res.status} ${body.replace(/<[^>]*>/g, "").slice(0, 200)}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payee-employee-report-${selection.startDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [id]);

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Loading employee details...</div>;
  }
  if (!employee) {
    return <div className="text-center text-red-500 py-12">Employee not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/payments")}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            &larr; Back to Payments
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
            <p className="text-sm text-gray-500">
              {employee.role.replace(/_/g, " ")} &mdash; {employee.department}
            </p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
          {(["today", "week", "month", "12months", "custom"] as const).map((tw) => (
            <button
              key={tw}
              onClick={() => {
                setTimeWindow(tw);
                setSelectedDate(null);
                if (tw === "today") { setCustomStart(""); setCustomEnd(""); }
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                timeWindow === tw ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              {tw === "today" ? "Today" : tw === "week" ? "This Week" : tw === "month" ? "This Month" : tw === "12months" ? "12 Months" : "Custom"}
            </button>
          ))}
        </div>
        {timeWindow === "custom" && (
          <div className="flex gap-2 items-center mt-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SingleDonutChart
          value={totalPieces}
          total={totalTarget}
          title="Period Performance"
          subtitle="Actual vs target"
          color={perfColor}
          centerLabel={`${periodPerf}%`}
          centerSubLabel="performance"
          height={220}
        />

        <ChartCard title="Total Output" subtitle="All entries this period" variant="gradient" accentColor={palette.blue}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-blue-600">{totalPieces.toLocaleString()}</span>
            <span className="text-xs text-gray-500 mt-2">
              {daysWorked} day{daysWorked !== 1 ? "s" : ""} worked
            </span>
          </div>
        </ChartCard>

        <ChartCard title="Avg Per Day" subtitle="Daily average output" variant="gradient" accentColor={palette.teal}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-teal-600">{avgPerDay.toLocaleString()}</span>
            <span className="text-xs text-gray-500 mt-2">pieces per day</span>
          </div>
        </ChartCard>

        <ChartCard title="Due Amount" subtitle="Unpaid earnings" variant="gradient" accentColor={palette.orange}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-orange-600">{formatCurrency(dueAmount)}</span>
            <span className="text-xs text-gray-500 mt-2">
              {dueEntries.length} entr{dueEntries.length !== 1 ? "ies" : "y"} due
            </span>
          </div>
        </ChartCard>

        <ChartCard title="Paid Amount" subtitle="Already paid" variant="gradient" accentColor={palette.green}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-green-600">{formatCurrency(paidAmount)}</span>
            <span className="text-xs text-gray-500 mt-2">
              {paidEntries.length} entr{paidEntries.length !== 1 ? "ies" : "y"} paid
            </span>
          </div>
        </ChartCard>

        <ChartCard title="Days Worked" subtitle="Active days this period" variant="gradient" accentColor={palette.purple}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-purple-600">{daysWorked}</span>
            <span className="text-xs text-gray-500 mt-2">
              out of {filteredEntries.length} entr{filteredEntries.length !== 1 ? "ies" : "y"}
            </span>
          </div>
        </ChartCard>

        {stageData.length > 0 ? (
          <ScreenReadersBarChart
            data={stageData}
            title="Stage Distribution"
            subtitle="Pieces per stage"
            color={palette.pink}
            height={220}
            labelWidth={120}
          />
        ) : (
          <ChartCard title="Stage Distribution" subtitle="Pieces per stage" variant="gradient">
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No stage data</div>
          </ChartCard>
        )}

        {earningsTrendData.length > 0 ? (
          <TransactionValueChart
            data={earningsTrendData}
            title="Earnings Trend"
            subtitle="Paid earnings over time"
            color={palette.green}
            height={220}
          />
        ) : (
          <ChartCard title="Earnings Trend" subtitle="Paid earnings over time" variant="gradient">
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No paid entries</div>
          </ChartCard>
        )}

        {dueTrendData.length > 0 ? (
          <TransactionValueChart
            data={dueTrendData}
            title="Due Amount Trend"
            subtitle="Unpaid earnings over time"
            color={palette.orange}
            height={220}
          />
        ) : (
          <ChartCard title="Due Amount Trend" subtitle="Unpaid earnings over time" variant="gradient">
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">All entries paid</div>
          </ChartCard>
        )}

        <ChartCard title="NSSF" subtitle="National Social Security Fund" variant="gradient" accentColor={palette.blue}>
          <div className="flex flex-col h-full justify-center">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <div className="text-xs text-red-600 font-medium">Employee (5%)</div>
                <div className="text-lg font-bold text-red-700">
                  UGX {nssfSummary.totalEmployeeDeduction.toLocaleString()}
                </div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <div className="text-xs text-blue-600 font-medium">Business (10%)</div>
                <div className="text-lg font-bold text-blue-700">
                  UGX {nssfSummary.totalBusinessContribution.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500">
              {nssfSummary.hasNssf
                ? `Based on gross earnings of UGX ${nssfSummary.gross.toLocaleString()}`
                : "No earnings recorded for this period"}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="PAYEE" subtitle="Pay As You Earn" variant="gradient" accentColor={palette.orange}>
          <div className="flex flex-col h-full justify-center">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 bg-orange-50 rounded-lg">
                <div className="text-xs text-orange-600 font-medium">Total PAYEE</div>
                <div className="text-lg font-bold text-orange-700">
                  UGX {payeeSummary.totalPayee.toLocaleString()}
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 font-medium">Taxable</div>
                <div className="text-lg font-bold text-gray-700">{payeeSummary.taxableCount}</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <div className="text-xs text-green-600 font-medium">Tax Free</div>
                <div className="text-lg font-bold text-green-700">{payeeSummary.taxFreeCount}</div>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500">
              {payeeSummary.hasPayee
                ? `Based on gross earnings of UGX ${payeeSummary.gross.toLocaleString()} — ${payeeSummary.bracketLabel} bracket`
                : `No PAYEE — ${payeeSummary.bracketLabel} bracket (${payeeSummary.gross.toLocaleString()} UGX)`}
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportCard title="Worker Report" subtitle="Download a PDF summary of worker payment data" onGenerate={handleGenerateReport} />
        <ReportCard title="NSSF Report" subtitle="Download NSSF deductions report for this employee" onGenerate={handleGenerateNssfReport} />
        <ReportCard title="PAYEE Report" subtitle="Download PAYEE tax report for this employee" onGenerate={handleGeneratePayeeReport} />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {(["calendar", "breakdown", "history", "nssf", "payee"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? "text-gray-900 border-gray-900"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {tab === "calendar" ? "Calendar View" : tab === "breakdown" ? "Daily Breakdown" : tab === "history" ? "Payment History" : tab === "nssf" ? "NSSF" : "PAYEE"}
          </button>
        ))}
      </div>

      {/* Tab: Calendar View */}
      {activeTab === "calendar" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {format(calendarDate, "MMMM yyyy")}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const d = new Date(calendarDate);
                  d.setMonth(d.getMonth() - 1);
                  setCalendarDate(d);
                }}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                &lt;
              </button>
              <button
                onClick={() => setCalendarDate(new Date())}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const d = new Date(calendarDate);
                  d.setMonth(d.getMonth() + 1);
                  setCalendarDate(d);
                }}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                &gt;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-gray-200">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-medium text-gray-500 uppercase"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const hasEntry = entryDates.has(dateStr);
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                  className={`min-h-[80px] p-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !isSameMonth(day, monthStart) ? "bg-gray-50/50 text-gray-400" : ""
                  } ${isToday(day) ? "bg-blue-50/30" : ""} ${
                    selectedDate === dateStr ? "ring-2 ring-inset ring-gray-900" : ""
                  }`}
                >
                  <div
                    className={`text-xs font-semibold ${
                      isToday(day) ? "text-blue-600" : "text-gray-700"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  {hasEntry && (
                    <div className="mt-1 flex justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                  )}
                  {hasEntry && (() => {
                    const dayTotal = entries
                      .filter((e) => e.date === dateStr)
                      .reduce((s, e) => s + e.earningsUgx, 0);
                    return (
                      <div className="text-[10px] text-gray-500 mt-1">
                        UGX {(dayTotal / 1000).toFixed(0)}k
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Selected date detail */}
          {selectedDate && (
            <div className="p-6 border-t border-gray-200 bg-gray-50/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {format(parseISO(selectedDate), "MMM do, yyyy")}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-500 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>

              {dayEntries.length === 0 ? (
                <p className="text-sm text-gray-400">No production entries for this date.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500">Pieces Produced</div>
                      <div className="text-lg font-bold text-gray-900">
                        {dayEntries.reduce((s, e) => s + e.actualPieces, 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500">Due Amount</div>
                      <div className="text-lg font-bold text-amber-600">
                        UGX {dayDue.reduce((s, e) => s + e.earningsUgx, 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                      <div className="text-xs text-gray-500">Paid Amount</div>
                      <div className="text-lg font-bold text-green-600">
                        UGX {dayPaid.reduce((s, e) => s + e.earningsUgx, 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                        <th className="text-left pb-2 pr-4">Stage</th>
                        <th className="text-left pb-2 pr-4">Pieces</th>
                        <th className="text-left pb-2 pr-4">Target</th>
                        <th className="text-left pb-2 pr-4">Earnings</th>
                        <th className="text-left pb-2 pr-4">Perf.</th>
                        <th className="text-left pb-2 pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayEntries.map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-200 last:border-0">
                          <td className="py-2 pr-4 text-gray-700">
                            {STAGE_LABELS[entry.stageId as StageId] ?? entry.stageId}
                          </td>
                          <td className="py-2 pr-4 text-gray-900 font-medium">
                            {entry.actualPieces}
                          </td>
                          <td className="py-2 pr-4 text-gray-500">{entry.targetPieces}</td>
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
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Daily Breakdown */}
      {activeTab === "breakdown" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No production entries found for this period.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pieces</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perf.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEntries.map((entry, i) => (
                  <tr
                    key={entry.id}
                    className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                  >
                    <td className="px-4 py-3 text-sm text-gray-700">{entry.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {STAGE_LABELS[entry.stageId as StageId] ?? entry.stageId}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {entry.actualPieces}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.targetPieces}</td>
                    <td className="px-4 py-3 text-sm text-ugx font-medium">
                      UGX {entry.earningsUgx.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={entry.performancePct} />
                    </td>
                    <td className="px-4 py-3">
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
          )}
        </div>
      )}

      {/* Tab: Payment History */}
      {activeTab === "history" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No payment records found for this employee.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {p.periodStart} &mdash; {p.periodEnd}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-ugx">
                      UGX {p.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          p.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {p.paidDate || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {p.receiptNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.receiptNumber && (
                        <button
                          onClick={() => handleDownloadReceipt(p.id)}
                          className="text-sm text-stock-blue hover:underline"
                        >
                          Download PDF
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: NSSF History */}
      {activeTab === "nssf" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          {nssfSummary.gross === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No NSSF records found for this employee in the selected period.
            </div>
          ) : (
            <>
              <div className="p-4 bg-blue-50 border-b border-blue-200">
                <div className="text-sm text-blue-800">
                  <span className="font-semibold">Total NSSF Deducted (Employee 5%): </span>
                  UGX {nssfSummary.totalEmployeeDeduction.toLocaleString()}
                  <span className="mx-4">|</span>
                  <span className="font-semibold">Total NSSF Business (10%): </span>
                  UGX {nssfSummary.totalBusinessContribution.toLocaleString()}
                </div>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period Gross (UGX)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NSSF Employee (5%)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NSSF Business (10%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="bg-white">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      UGX {nssfSummary.gross.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600">
                      UGX {nssfSummary.totalEmployeeDeduction.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      UGX {nssfSummary.totalBusinessContribution.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Tab: PAYEE History */}
      {activeTab === "payee" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          {payeeSummary.gross === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No PAYEE records found for this employee in the selected period.
            </div>
          ) : (
            <>
              <div className="p-4 bg-orange-50 border-b border-orange-200">
                <div className="text-sm text-orange-800">
                  <span className="font-semibold">Total PAYEE: </span>
                  UGX {payeeSummary.totalPayee.toLocaleString()}
                  <span className="mx-4">|</span>
                  <span className="font-semibold">Bracket: </span>
                  {payeeSummary.bracketLabel} ({payeeSummary.bracketRate}%)
                  <span className="mx-4">|</span>
                  <span className="font-semibold">Gross: </span>
                  UGX {payeeSummary.gross.toLocaleString()}
                </div>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period Gross (UGX)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Bracket</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PAYEE (UGX)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="bg-white">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      UGX {payeeSummary.gross.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {payeeSummary.bracketLabel}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payeeSummary.bracketRate === 0 ? (
                        <span className="text-green-600 font-medium">Tax Free</span>
                      ) : (
                        <span className="text-gray-700">{payeeSummary.bracketRate}%</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${payeeSummary.totalPayee > 0 ? "text-red-600" : "text-green-600"}`}>
                      {payeeSummary.totalPayee > 0 ? `UGX ${payeeSummary.totalPayee.toLocaleString()}` : "0 (Tax Free)"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
