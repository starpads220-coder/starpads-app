"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  runTransaction,
  doc,
  deleteDoc,
  Timestamp,
  limit,
  where,
  getDocsFromServer,
  getDocFromServer,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  ProductionEntry,
  Employee,
  ProductionStage,
  StageId,
  STAGE_LABELS,
  Payment,
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
import {
  computeNssfEmployee,
  computeNssfBusiness,
  calculateProgressivePaye,
  type PayeBand,
  type PayeBandResult,
} from "@/lib/deductions";
import { usePayeSettings } from "@/hooks/use-paye-settings";
import { PAYE_SETTINGS_REF } from "@/hooks/use-paye-settings";
import { DEFAULT_PAYE_BANDS } from "@/lib/deductions";
import { useRealtimeCollection } from "@/hooks/use-firestore-query";
import { NssfCard } from "@/components/payments/NssfCard";
import { PayeeCard } from "@/components/payments/PayeeCard";
import { PayeRemittanceCard } from "@/components/payments/PayeRemittanceCard";
import { isEmployeeActive } from "@/lib/employees";

type TimeWindow = "today" | "week" | "month" | "12months" | "custom";
type ActiveTab = "employees" | "dates";

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

function getMonthBounds(dateStr: string) {
  const d = new Date(dateStr);
  const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const monthEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { monthStart, monthEnd };
}

async function getCumulativePayeeForEmployee(
  employeeId: string,
  currentPaymentGross: number,
  todayStr: string,
  bands: PayeBand[],
  applicable: boolean,
): Promise<{ tax: number; breakdown: PayeBandResult[]; previousWithheld: number }> {
  if (!applicable) return { tax: 0, breakdown: [], previousWithheld: 0 };
  const { monthStart, monthEnd } = getMonthBounds(todayStr);
  const existingPaymentsSnap = await getDocsFromServer(
    query(
      collection(db, "payments"),
      where("employeeId", "==", employeeId),
      where("paidDate", ">=", monthStart),
      where("paidDate", "<=", monthEnd),
      orderBy("paidDate", "desc")
    )
  );
  const confirmed = existingPaymentsSnap.docs.filter(d => d.data().status === "paid" && d.data().payeApplicable !== false);
  const alreadyPaidPayee = confirmed.reduce(
    (sum, d) => sum + (Number(d.data().payeeTax) || 0),
    0
  );
  const existingGross = confirmed.reduce(
    (sum, d) => sum + (Number(d.data().grossAmount ?? d.data().totalAmount) || 0),
    0
  );
  const totalMonthlyGross = existingGross + currentPaymentGross;
  const calculated = calculateProgressivePaye(totalMonthlyGross, bands);
  return { tax: Math.max(0, calculated.tax - alreadyPaidPayee), breakdown: calculated.breakdown, previousWithheld: alreadyPaidPayee };
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
  allEntries: ProductionEntry[];
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
  const router = useRouter();
  const { userRole } = useAuth();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("employees");
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [deleteConfirmEntryId, setDeleteConfirmEntryId] = useState<string | null>(null);

  const [payEmployeeId, setPayEmployeeId] = useState<string | null>(null);
  const [payProcessing, setPayProcessing] = useState(false);
  const [modalPayePreview, setModalPayePreview] = useState<{ key: string; tax: number; breakdown: PayeBandResult[]; previousWithheld: number } | null>(null);
  const [paymentSourceCode, setPaymentSourceCode] = useState<"" | "1000" | "1030">("");
  const { bands: payeBands, loading: payeSettingsLoading, error: payeSettingsError } = usePayeSettings();
  const confirmedPayments = useRealtimeCollection<Payment>("payments");

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

  const { start, end } = getDateBounds(timeWindow, customStart || undefined, customEnd || undefined);
  const filteredEntries = useMemo(() =>
    entries.filter((e) => e.date >= start && e.date <= end),
    [entries, start, end]
  );
  const periodConfirmedPayments = useMemo(() => confirmedPayments.data.filter(payment => payment.status === "paid" && payment.paidDate >= start && payment.paidDate <= end), [confirmedPayments.data, start, end]);
  const confirmedTotalsByEmployee = useMemo(() => {
    const totals = new Map<string, { gross: number; paye: number; net: number }>();
    for (const payment of periodConfirmedPayments) {
      const row = totals.get(payment.employeeId) ?? { gross: 0, paye: 0, net: 0 };
      const gross = payment.grossAmount ?? payment.totalAmount ?? payment.amountUgx ?? 0;
      const paye = payment.payeeTax ?? 0;
      row.gross += gross;
      row.paye += paye;
      row.net += payment.netPayAmount ?? (gross - (payment.nssfEmployeeDeduction ?? 0) - paye);
      totals.set(payment.employeeId, row);
    }
    return totals;
  }, [periodConfirmedPayments]);

  const supervisorDepartment = useMemo(() =>
    userRole?.role === "PRODUCTION_SUPERVISOR" && userRole?.employeeId
      ? employees.find((e) => e.id === userRole.employeeId)?.department ?? null
      : null,
    [userRole, employees]
  );

  // Keep inactive workers in payment records so earned/unpaid amounts and all
  // historical totals remain visible. Payment confirmation is blocked below.
  const productionEmployees = useMemo(() =>
    employees.filter(
      (e) => supervisorDepartment ? e.department === supervisorDepartment : e.department === "PRODUCTION"
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

      const sortedAll = [...empEntries].sort((a, b) => b.date.localeCompare(a.date));
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
        allEntries: sortedAll,
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

  const isAdmin = userRole?.role === "ADMIN";
  const isSupervisor = userRole?.role === "PRODUCTION_SUPERVISOR";
  const canEdit = isAdmin || isSupervisor;
  const canDelete = isAdmin || isSupervisor;

  const windowDayCount = useMemo(() => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  }, [start, end]);

  const handleWindowChange = (tw: TimeWindow) => {
    setTimeWindow(tw);
    setExpandedDate(null);
    setExpandedEmployee(null);
    if (tw === "today") { setCustomStart(""); setCustomEnd(""); }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteDoc(doc(db, "productionEntries", entryId));
      showToast("Entry deleted successfully.", "success");
      setDeleteConfirmEntryId(null);
    } catch (err: unknown) {
      showToast(`Failed to delete entry: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
    }
  };

  const payEmployee = employeePayments.find((e) => e.employeeId === payEmployeeId);
  const payeApplicable = employees.find(e => e.id === payEmployeeId)?.payeApplicable !== false;
  const previewEmployeeId = payEmployee?.employeeId;
  const previewGross = payEmployee?.dueAmount;
  const payePreviewKey = `${previewEmployeeId ?? ""}|${previewGross ?? ""}|${payeApplicable}|${JSON.stringify(payeBands)}`;
  const modalPayeeTax = modalPayePreview?.key === payePreviewKey ? modalPayePreview.tax : null;
  const modalPayeBreakdown = modalPayePreview?.key === payePreviewKey ? modalPayePreview.breakdown : [];
  const modalPreviouslyWithheld = modalPayePreview?.key === payePreviewKey ? modalPayePreview.previousWithheld : 0;

  useEffect(() => {
    if (!previewEmployeeId || !previewGross) return;
    let cancelled = false;
    const todayStr = new Date().toISOString().split("T")[0];
    getCumulativePayeeForEmployee(previewEmployeeId, previewGross, todayStr, payeBands, payeApplicable)
      .then((result) => { if (!cancelled) setModalPayePreview({ key: payePreviewKey, ...result }); })
      .catch(() => { if (!cancelled) setModalPayePreview(null); });
    return () => { cancelled = true; };
  }, [previewEmployeeId, previewGross, payeBands, payeApplicable, payePreviewKey]);

  const handlePayConfirm = async () => {
    if (!payEmployee || payEmployee.dueEntries.length === 0 || payProcessing) return;
    if (!paymentSourceCode) { showToast("Select Cash or Bank before confirming payment.", "error"); return; }
    if (payeSettingsLoading || payeSettingsError || modalPayeeTax === null) { showToast("PAYE could not be verified. Please wait or check settings before confirming.", "error"); return; }
    setPayProcessing(true);
    try {
      const receiptNumber = await getNextReceiptNumber();
      const todayStr = new Date().toISOString().split("T")[0];
      const [currentEmployee, currentSettings] = await Promise.all([
        getDocFromServer(doc(db, "employees", payEmployee.employeeId)),
        getDocFromServer(doc(db, "payeSettings", PAYE_SETTINGS_REF)),
      ]);
      if (!currentEmployee.exists()) throw new Error("Employee record no longer exists.");
      const currentApplicable = currentEmployee.data().payeApplicable !== false;
      if (!isEmployeeActive(currentEmployee.data())) {
        throw new Error("This employee is deactivated. Reactivate them before confirming a new payment.");
      }
      const currentBands = (currentSettings.data()?.bands as PayeBand[] | undefined) ?? DEFAULT_PAYE_BANDS;
      calculateProgressivePaye(0, currentBands);
      if (currentApplicable !== payeApplicable || JSON.stringify(currentBands) !== JSON.stringify(payeBands)) {
        throw new Error("PAYE settings or employee eligibility changed. Review the updated calculation before confirming.");
      }

      const grossAmount = payEmployee.dueAmount;
      const nssfEmployeeDeduction = computeNssfEmployee(grossAmount);
      const nssfBusinessContribution = computeNssfBusiness(grossAmount);
      const payeResult = await getCumulativePayeeForEmployee(
        payEmployee.employeeId,
        grossAmount,
        todayStr,
        currentBands,
        currentApplicable,
      );
      const payeeTax = payeResult.tax;
      const netPayAmount = grossAmount - nssfEmployeeDeduction - payeeTax;

      const paymentRef = doc(collection(db, "payments"));
      const paymentRecord = {
        employeeId: payEmployee.employeeId,
        periodStart: start,
        periodEnd: end,
        grossAmount,
        totalAmount: grossAmount,
        nssfEmployeeDeduction,
        nssfBusinessContribution,
        payeeTax,
        payeBandBreakdown: payeResult.breakdown,
        payePreviouslyWithheld: payeResult.previousWithheld,
        payeBandsApplied: currentBands,
        payeApplicable: currentApplicable,
        paymentSourceCode,
        payrollVersion: 2,
        netPayAmount,
        status: "paid",
        paidDate: todayStr,
        receiptNumber,
        notes: "",
        createdAt: Timestamp.now(),
        createdBy: userRole?.uid ?? "",
      };
      await runTransaction(db, async transaction => {
        const entryRefs = payEmployee.dueEntries.map(entry => doc(db, "productionEntries", entry.id));
        const snapshots = await Promise.all(entryRefs.map(ref => transaction.get(ref)));
        if (snapshots.some((snap, index) => !snap.exists() || snap.data()?.paymentStatus === "paid" || snap.data()?.paymentId || snap.data()?.earningsUgx !== payEmployee.dueEntries[index].earningsUgx)) {
          throw new Error("One or more production entries changed or were already paid. Refresh the page before retrying.");
        }
        transaction.set(paymentRef, paymentRecord);
        entryRefs.forEach(ref => transaction.update(ref, { paymentStatus: "paid", paymentId: paymentRef.id }));
      });

      showToast(
        `Net payment of UGX ${netPayAmount.toLocaleString()} to ${payEmployee.employeeName} — Receipt: ${receiptNumber}`,
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
            grossAmount={grossAmount}
            nssfEmployeeDeduction={nssfEmployeeDeduction}
            nssfBusinessContribution={nssfBusinessContribution}
            payeeTax={payeeTax}
            payeBandBreakdown={payeResult.breakdown}
            payePreviouslyWithheld={payeResult.previousWithheld}
            paymentSourceCode={paymentSourceCode}
            netPayAmount={netPayAmount}
            totalAmount={grossAmount}
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
      setPaymentSourceCode("");
    } catch (err: unknown) {
      console.error("Payment error:", err);
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("index") || msg.includes("FAILED_PRECONDITION")) {
        showToast(
          `Payment failed — missing database index. Please create the required index and try again: ${msg}`,
          "error"
        );
      } else {
        showToast(`Payment failed: ${msg || "Unknown error. Please try again."}`, "error");
      }
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

  const formatMaterialDisplay = (entry: ProductionEntry): string => {
    if (entry.materialTypes && entry.materialTypes.length > 0) {
      return entry.materialTypes.map(m => m === "MICROFIBER" ? "Microfiber" : m.charAt(0) + m.slice(1).toLowerCase()).join(", ");
    }
    if (entry.materialType) {
      return entry.materialType === "MICROFIBER" ? "Microfiber" : entry.materialType.charAt(0) + entry.materialType.slice(1).toLowerCase();
    }
    return "—";
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

  const handleGenerateNssfReport = useCallback(async (selection: PeriodSelection) => {
    const params = new URLSearchParams({
      screen: "nssf",
      periodType: selection.type,
      startDate: selection.startDate,
      endDate: selection.endDate,
      periodLabel: selection.periodLabel,
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
    a.download = `nssf-report-${selection.startDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleGeneratePayeeReport = useCallback(async (selection: PeriodSelection) => {
    const params = new URLSearchParams({
      screen: "payee",
      periodType: selection.type,
      startDate: selection.startDate,
      endDate: selection.endDate,
      periodLabel: selection.periodLabel,
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
    a.download = `payee-report-${selection.startDate}.pdf`;
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
        <div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-gray-900">Payments</h1>{["ADMIN", "FINANCIAL_MANAGER"].includes(userRole?.role ?? "") && <Link href="/payments/paye-settings" className="text-sm text-blue-700 hover:underline">PAYE Settings</Link>}</div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["today", "week", "month", "12months", "custom"] as const).map((tw) => (
            <button
              key={tw}
              onClick={() => handleWindowChange(tw)}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NssfCard employeePayments={employeePayments} />
        <PayeeCard payments={periodConfirmedPayments} employees={employees} />
      </div>

      <PayeRemittanceCard />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportCard title="Payments Report" subtitle="Download a PDF summary of payment data" onGenerate={handleGenerateReport} />
        <ReportCard title="NSSF Report" subtitle="Download NSSF deductions report" onGenerate={handleGenerateNssfReport} />
        <ReportCard title="PAYE Report" subtitle="Download PAYE tax report" onGenerate={handleGeneratePayeeReport} />
      </div>

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
            <table className="w-full min-w-[1320px] table-fixed divide-y divide-gray-200">
              <colgroup>
                <col className="w-[17%]" /><col className="w-[6%]" />
                <col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[10%]" />
                <col className="w-[6%]" /><col className="w-[8%]" /><col className="w-[7%]" /><col className="w-[8%]" />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pieces</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><span className="block text-[10px] tracking-wider">UGX</span>Due Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><span className="block text-[10px] tracking-wider">UGX</span>Paid Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><span className="block text-[10px] tracking-wider">UGX</span>Gross paid (paid date)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><span className="block text-[10px] tracking-wider">UGX</span>PAYE withheld (paid date)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><span className="block text-[10px] tracking-wider">UGX</span>Net paid (paid date)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><span className="block text-[10px] tracking-wider">UGX</span>Avg/Day</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perf.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employeePayments.map((emp, i) => (
                  <React.Fragment key={emp.employeeId}>
                    <tr
                      onClick={() => setExpandedEmployee(expandedEmployee === emp.employeeId ? null : emp.employeeId)}
                      className={`cursor-pointer ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-gray-100 transition-colors`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/payments/worker/${emp.employeeId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium text-stock-blue hover:underline"
                        >
                          {emp.employeeName}
                          {!isEmployeeActive(employees.find(employee => employee.id === emp.employeeId) ?? {}) && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">Deactivated</span>}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {emp.totalPieces.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-amber-600">
                        {emp.dueAmount > 0 ? emp.dueAmount.toLocaleString() : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-ugx">
                        {emp.paidAmount > 0 ? emp.paidAmount.toLocaleString() : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">{(confirmedTotalsByEmployee.get(emp.employeeId)?.gross ?? 0).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-red-700">{(confirmedTotalsByEmployee.get(emp.employeeId)?.paye ?? 0).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-green-700">{(confirmedTotalsByEmployee.get(emp.employeeId)?.net ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{emp.daysWorked}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                        {Math.round((emp.dueAmount + emp.paidAmount) / emp.daysWorked).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge value={emp.avgPerformance} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {emp.dueAmount > 0 && isEmployeeActive(employees.find(employee => employee.id === emp.employeeId) ?? {}) ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setPayEmployeeId(emp.employeeId); }}
                              className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800"
                            >
                              Pay Due
                            </button>
                          ) : emp.dueAmount > 0 ? (
                            <span className="text-xs font-medium text-gray-500">Due retained · Reactivate to pay</span>
                          ) : (
                            <span className="text-xs text-green-600 font-medium">✓ Paid</span>
                          )}
                          <span className="text-xs text-gray-400">{expandedEmployee === emp.employeeId ? "▲" : "▼"}</span>
                        </div>
                      </td>
                    </tr>
                    {expandedEmployee === emp.employeeId && (
                      <tr key={`${emp.employeeId}-detail`}>
                        <td colSpan={11} className="px-0 py-0">
                          <div className="w-full bg-gray-50 px-6 py-4 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              Entries for {emp.employeeName}
                            </h4>
                            <table className="w-full min-w-[1040px] table-fixed text-sm">
                              <colgroup><col className="w-[11%]" /><col className="w-[15%]" /><col className="w-[15%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[13%]" /><col className="w-[10%]" /><col className="w-[9%]" /><col className="w-[11%]" /></colgroup>
                              <thead>
                                <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                  <th className="text-left pb-2 pr-4">Date</th>
                                  <th className="text-left pb-2 pr-4">Stage</th>
                                  <th className="text-left pb-2 pr-4">Material</th>
                                  <th className="text-left pb-2 pr-4">Pieces</th>
                                  <th className="text-left pb-2 pr-4">Target</th>
                                  <th className="whitespace-nowrap pb-2 pr-4 text-right"><span className="block text-[10px] tracking-wider">UGX</span>Earnings</th>
                                  <th className="text-left pb-2 pr-4">Perf.</th>
                                  <th className="text-left pb-2 pr-4">Status</th>
                                  <th className="text-right pb-2 pr-4">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {emp.dueEntries.length > 0 && (
                                  <>
                                    <tr className="bg-amber-50/50">
                                      <td colSpan={9} className="py-2 px-3 text-xs font-bold text-amber-800 uppercase tracking-wider border-b border-gray-200">
                                        Due Entries ({emp.dueEntries.length})
                                      </td>
                                    </tr>
                                    {emp.dueEntries.map((entry) => (
                                      <tr key={entry.id} className="border-b border-gray-200 bg-amber-50/20 hover:bg-amber-50 transition-colors">
                                        <td className="py-2 pr-4 pl-3 text-gray-700">{entry.date}</td>
                                        <td className="py-2 pr-4 text-gray-700">
                                          {getStageLabel(entry.stageId)}
                                        </td>
                                        <td className="py-2 pr-4 text-gray-600 text-xs">
                                          {formatMaterialDisplay(entry)}
                                        </td>
                                        <td className="py-2 pr-4 text-gray-900 font-medium">
                                          {entry.actualPieces}
                                        </td>
                                        <td className="py-2 pr-4 text-gray-500">
                                          {entry.targetPieces}
                                        </td>
                                        <td className="whitespace-nowrap py-2 pr-4 text-right text-ugx font-medium">
                                          {entry.earningsUgx.toLocaleString()}
                                        </td>
                                        <td className="py-2 pr-4">
                                          <StatusBadge value={entry.performancePct} />
                                        </td>
                                        <td className="py-2 pr-4">
                                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                                            Due
                                          </span>
                                        </td>
                                        <td className="py-2 pr-4 text-right whitespace-nowrap">
                                          {canEdit && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const params = new URLSearchParams({
                                                  editEntryId: entry.id,
                                                });
                                                router.push(`/production?${params.toString()}`);
                                              }}
                                              className="text-xs text-stock-blue hover:underline mr-2"
                                            >
                                              Edit
                                            </button>
                                          )}
                                          {canDelete && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmEntryId(entry.id);
                                              }}
                                              className="text-xs text-red-600 hover:underline"
                                            >
                                              Delete
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </>
                                )}
                                {(() => {
                                  const paidEntries = emp.allEntries.filter((e) => e.paymentStatus === "paid");
                                  if (paidEntries.length === 0) return null;
                                  return (
                                    <>
                                      <tr className="bg-gray-50 mt-4">
                                        <td colSpan={9} className="py-2 px-3 text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                          Paid Entries ({paidEntries.length})
                                        </td>
                                      </tr>
                                      {paidEntries.map((entry) => (
                                        <tr key={entry.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                                          <td className="py-2 pr-4 pl-3 text-gray-700">{entry.date}</td>
                                          <td className="py-2 pr-4 text-gray-700">
                                            {getStageLabel(entry.stageId)}
                                          </td>
                                          <td className="py-2 pr-4 text-gray-600 text-xs">
                                            {formatMaterialDisplay(entry)}
                                          </td>
                                          <td className="py-2 pr-4 text-gray-900 font-medium">
                                            {entry.actualPieces}
                                          </td>
                                          <td className="py-2 pr-4 text-gray-500">
                                            {entry.targetPieces}
                                          </td>
                                          <td className="whitespace-nowrap py-2 pr-4 text-right text-ugx font-medium">
                                            {entry.earningsUgx.toLocaleString()}
                                          </td>
                                          <td className="py-2 pr-4">
                                            <StatusBadge value={entry.performancePct} />
                                          </td>
                                          <td className="py-2 pr-4">
                                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                              Paid
                                            </span>
                                          </td>
                                          <td className="py-2 pr-4 text-right whitespace-nowrap">
                                            {canEdit && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const params = new URLSearchParams({
                                                    editEntryId: entry.id,
                                                  });
                                                  router.push(`/production?${params.toString()}`);
                                                }}
                                                className="text-xs text-stock-blue hover:underline mr-2"
                                              >
                                                Edit
                                              </button>
                                            )}
                                            {canDelete && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeleteConfirmEntryId(entry.id);
                                                }}
                                                className="text-xs text-red-600 hover:underline"
                                              >
                                                Delete
                                              </button>
                                            )}
                                        </td>
                                        </tr>
                                      ))}
                                    </>
                                  );
                                })()}
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
                                  <th className="text-left pb-2 pr-4">Material</th>
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
                                    <td className="py-2 pr-4 text-gray-600 text-xs">
                                      {formatMaterialDisplay(entry)}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Entry</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this production entry? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmEntryId(null)}
                className="py-2 px-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEntry(deleteConfirmEntryId)}
                className="py-2 px-4 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
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
                  {timeWindow === "today" ? "Today" : timeWindow === "week" ? "This Week" : timeWindow === "month" ? "This Month" : timeWindow === "12months" ? "12 Months" : `${start} to ${end}`}
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
                  <span className="text-sm font-semibold text-amber-800">Gross Earnings</span>
                  <span className="text-xl font-bold text-amber-800">
                    UGX {payEmployee.dueAmount.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  {payEmployee.dueEntries.length} entry{payEmployee.dueEntries.length !== 1 ? "ies" : "y"} to be paid
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Gross Earnings</span>
                  <span className="font-semibold text-gray-900">UGX {payEmployee.dueAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">NSSF Employee Deduction (5%)</span>
                  <span className="font-semibold text-red-600">- UGX {computeNssfEmployee(payEmployee.dueAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">PAYE {payeApplicable ? "(progressive monthly bands)" : "(not applicable)"}</span>
                  <span className="font-semibold text-red-600">- UGX {modalPayeeTax === null ? "Calculating…" : modalPayeeTax.toLocaleString()}</span>
                </div>
                {modalPayeBreakdown.some(band => band.taxableAmount > 0) && <p className="text-xs font-medium text-gray-500">Calendar-month cumulative bands</p>}
                {modalPayeBreakdown.filter(band => band.taxableAmount > 0).map((band, index) => <div key={index} className="flex justify-between text-xs text-gray-500"><span>{band.ratePercent}% on UGX {band.taxableAmount.toLocaleString()}</span><span>UGX {Math.round(band.taxAmount).toLocaleString()}</span></div>)}
                {modalPreviouslyWithheld > 0 && <div className="flex justify-between text-xs text-gray-500"><span>PAYE already withheld this month</span><span>- UGX {modalPreviouslyWithheld.toLocaleString()}</span></div>}
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-sm">
                  <span className="font-semibold text-gray-800">Net Pay to Employee</span>
                  <span className="text-lg font-bold text-green-600">
                    {modalPayeeTax === null ? "Calculating…" : `UGX ${(payEmployee.dueAmount - computeNssfEmployee(payEmployee.dueAmount) - modalPayeeTax).toLocaleString()}`}
                  </span>
                </div>
                <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between items-center text-sm">
                  <span className="text-gray-500 italic">NSSF Business Contribution (10% — paid by employer)</span>
                  <span className="font-semibold text-blue-600">UGX {computeNssfBusiness(payEmployee.dueAmount).toLocaleString()}</span>
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-4">Pay from
                <select required value={paymentSourceCode} onChange={event => setPaymentSourceCode(event.target.value as "" | "1000" | "1030")} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2">
                  <option value="">Select Cash or Bank...</option><option value="1030">Cash</option><option value="1000">Bank</option>
                </select>
              </label>
              {timeWindow !== "month" && <p className="mb-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">PAYE still follows the existing calendar-month cumulative calculation; this {timeWindow} view only controls which unpaid production entries are selected. No proration is applied.</p>}
              {payeSettingsError && <p role="alert" className="mb-4 text-sm text-red-700">PAYE settings could not be loaded: {payeSettingsError}</p>}

              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                    <th className="text-left pb-2 pr-4">Date</th>
                    <th className="text-left pb-2 pr-4">Stage</th>
                    <th className="text-left pb-2 pr-4">Material</th>
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
                      <td className="py-2 pr-4 text-gray-600 text-xs">
                        {formatMaterialDisplay(entry)}
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
                disabled={payProcessing || !paymentSourceCode || modalPayeeTax === null || payeSettingsLoading || !!payeSettingsError}
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
