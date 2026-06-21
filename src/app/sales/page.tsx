"use client";

import { type FormEvent, useEffect, useState, useMemo, useCallback } from "react";
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  limit,
} from "firebase/firestore";
import dynamic from "next/dynamic";

import { RouteGuard } from "@/components/auth/RouteGuard";
import { SalesCalendar } from "@/components/ui/SalesCalendar";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  CustomerType,
  Expense,
  PackSize,
  PaymentMethod,
  SaleTransaction,
  SalesTarget,
} from "@/types";
import { useCollectionQuery } from "@/hooks/use-firestore-query";
import { ReportCard } from "@/components/reports/ReportCard";
import type { PeriodSelection } from "@/components/reports/PeriodSelector";

const SalesCharts = dynamic(() => import("@/components/sales/SalesCharts"), {
  ssr: false,
  loading: () => (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-lg" />)}
      </div>
      <div className="h-96 bg-gray-100 rounded-lg" />
      <div className="h-64 bg-gray-100 rounded-lg" />
    </div>
  ),
});

type TabKey = "dashboard" | "calendar" | "entry";
type AnalyticsPeriod = "week" | "month" | "12months" | "custom";
type SalesTargetType = "MONTHLY" | "QUARTERLY" | "SIX_MONTHS" | "ANNUAL";

const SALES_TARGET_TYPE_LABELS: Record<SalesTargetType, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SIX_MONTHS: "6 Months",
  ANNUAL: "Annual",
};

function getPeriodBounds(period: AnalyticsPeriod, customStart?: string, customEnd?: string) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  switch (period) {
    case "week": {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 6);
      return { start: weekStart.toISOString().split("T")[0], end: todayStr };
    }
    case "month": {
      const monthStart = new Date(now);
      monthStart.setDate(now.getDate() - 29);
      return { start: monthStart.toISOString().split("T")[0], end: todayStr };
    }
    case "12months": {
      const yearStart = new Date(now);
      yearStart.setFullYear(now.getFullYear() - 1);
      return { start: yearStart.toISOString().split("T")[0], end: todayStr };
    }
    case "custom": {
      return {
        start: customStart || todayStr,
        end: customEnd || todayStr,
      };
    }
    default:
      return { start: todayStr, end: todayStr };
  }
}

function getDateKey(date = new Date()) {
  return date.toISOString().split("T")[0];
}



export default function SalesPage() {
  const { userRole } = useAuth();
  const [transactions, setTransactions] = useState<SaleTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetForm, setTargetForm] = useState({
    targetType: "MONTHLY" as SalesTargetType,
    targetAmount: 0,
    periodReference: "",
    description: "",
  });
  const [targetSaving, setTargetSaving] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: getDateKey(),
    customerName: "",
    customerType: "RETAIL" as CustomerType,
    packSize: "HALF_DOZEN" as PackSize,
    quantitySold: 0,
    unitPrice: 0,
    paymentMethod: "CASH" as PaymentMethod,
    salespersonId: "",
    notes: "",
  });

  const { data: employees = [] } = useCollectionQuery<{ id: string; name: string; role: string; department: string }>("employees", [
    orderBy("name"),
  ], { staleTime: 10 * 60 * 1000 });

  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, "saleTransactions"), orderBy("date", "desc"), limit(500)),
      (snap) => {
        setTransactions(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SaleTransaction)));
      },
      (err) => {
        console.error("saleTransactions listener error:", err);
      },
    );

    const unsub2 = onSnapshot(
      query(collection(db, "expenses"), orderBy("date", "desc"), limit(500)),
      (snap) => {
        setExpenses(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Expense)));
      },
      (err) => {
        console.error("expenses listener error:", err);
      },
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const periodBounds = useMemo(
    () => getPeriodBounds(analyticsPeriod, customStart, customEnd),
    [analyticsPeriod, customStart, customEnd]
  );

  const filteredTransactions = useMemo(
    () => transactions.filter((t) => t.date >= periodBounds.start && t.date <= periodBounds.end),
    [transactions, periodBounds]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.date >= periodBounds.start && e.date <= periodBounds.end),
    [expenses, periodBounds]
  );

  const { data: salesTargets = [] } = useCollectionQuery<SalesTarget>("salesTargets", [
    orderBy("createdAt", "desc"),
  ], { staleTime: 30 * 1000 });

  const totalAmount = form.quantitySold * form.unitPrice;

  const salespersonEmployees = useMemo(
    () => employees.filter((e) => e.department === "SALES"),
    [employees]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "saleTransactions"), {
        ...form,
        totalAmount,
        createdAt: Timestamp.now(),
      });
      setForm({
        date: getDateKey(),
        customerName: "",
        customerType: "RETAIL",
        packSize: "HALF_DOZEN",
        quantitySold: 0,
        unitPrice: 0,
        paymentMethod: "CASH",
        salespersonId: "",
        notes: "",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTargetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTargetSaving(true);
    try {
      if (editingTargetId) {
        await updateDoc(doc(db, "salesTargets", editingTargetId), {
          ...targetForm,
        });
      } else {
        await addDoc(collection(db, "salesTargets"), {
          ...targetForm,
          createdAt: Timestamp.now(),
          createdBy: userRole?.uid ?? "",
        });
      }
      setTargetForm({
        targetType: "MONTHLY",
        targetAmount: 0,
        periodReference: "",
        description: "",
      });
      setShowTargetForm(false);
      setEditingTargetId(null);
    } finally {
      setTargetSaving(false);
    }
  };

  const handleEditTarget = (target: SalesTarget) => {
    setTargetForm({
      targetType: target.targetType,
      targetAmount: target.targetAmount,
      periodReference: target.periodReference,
      description: target.description,
    });
    setEditingTargetId(target.id);
    setShowTargetForm(true);
  };

  const handleDeleteTarget = async (id: string) => {
    if (!confirm("Delete this sales target?")) return;
    try {
      await deleteDoc(doc(db, "salesTargets", id));
    } catch {
      // silently fail
    }
  };

  const handleGenerateReport = useCallback(async (selection: PeriodSelection) => {
    const params = new URLSearchParams({
      screen: "sales",
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
    a.download = `sales-report-${selection.startDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <RouteGuard>
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales & Revenue Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Revenue movement, product mix, customer split, and operational performance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["dashboard", "calendar", "entry"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-gray-900 text-white shadow-sm"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab === "dashboard" ? "Dashboard" : tab === "calendar" ? "Calendar" : "New Sale"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
              <p className="text-sm text-gray-500">
                {analyticsPeriod === "week" ? "Last 7 days" : analyticsPeriod === "month" ? "Last 30 days" : analyticsPeriod === "12months" ? "Last 12 months" : "Custom period"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(["week", "month", "12months", "custom"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setAnalyticsPeriod(p)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                      analyticsPeriod === p ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {p === "week" ? "Week" : p === "month" ? "Month" : p === "12months" ? "12 Months" : "Custom"}
                  </button>
                ))}
              </div>
              {analyticsPeriod === "custom" && (
                <div className="flex items-center gap-2">
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-32" />
                  <span className="text-xs text-gray-400">to</span>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-32" />
                </div>
              )}
            </div>
          </div>

          <SalesCharts transactions={filteredTransactions} expenses={filteredExpenses} salesTargets={salesTargets} />

          {/* Sales Targets Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Sales Targets</h2>
                <p className="text-sm text-gray-500 mt-1">Set and track monthly, quarterly, 6-month, and annual targets.</p>
              </div>
              <button
                onClick={() => {
                  setShowTargetForm(!showTargetForm);
                  setEditingTargetId(null);
                  setTargetForm({ targetType: "MONTHLY", targetAmount: 0, periodReference: "", description: "" });
                }}
                className="py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
              >
                {showTargetForm ? (editingTargetId ? "Cancel Edit" : "Cancel") : "New Target"}
              </button>
            </div>

            {showTargetForm && (
              <form onSubmit={handleTargetSubmit} className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Type</label>
                    <select value={targetForm.targetType} onChange={(e) => setTargetForm({ ...targetForm, targetType: e.target.value as SalesTargetType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                      {(["MONTHLY", "QUARTERLY", "SIX_MONTHS", "ANNUAL"] as const).map((t) => (
                        <option key={t} value={t}>{SALES_TARGET_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount (UGX)</label>
                    <input type="number" value={targetForm.targetAmount || ""} onChange={(e) => setTargetForm({ ...targetForm, targetAmount: parseInt(e.target.value) || 0 })}
                      required min={0} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period Reference</label>
                    <input type="text" value={targetForm.periodReference} onChange={(e) => setTargetForm({ ...targetForm, periodReference: e.target.value })}
                      required placeholder="e.g. 2026-Q2, 2026" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input type="text" value={targetForm.description} onChange={(e) => setTargetForm({ ...targetForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Optional notes" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={targetSaving}
                    className="py-2 px-6 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50">
                    {targetSaving ? "Saving..." : editingTargetId ? "Update Target" : "Create Target"}
                  </button>
                </div>
              </form>
            )}

            {salesTargets.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No targets configured. Create your first target above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {salesTargets.map((t, i) => (
                      <tr key={t.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="px-4 py-3 font-medium text-gray-900">{SALES_TARGET_TYPE_LABELS[t.targetType]}</td>
                        <td className="px-4 py-3 text-ugx font-medium">UGX {t.targetAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-700">{t.periodReference}</td>
                        <td className="px-4 py-3 text-gray-500">{t.description || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditTarget(t)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTarget(t.id)}
                              className="text-xs font-medium text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <ReportCard title="Sales Report" subtitle="Download a PDF summary of sales and revenue data" onGenerate={handleGenerateReport} />
        </>
      )}

      {activeTab === "calendar" && <SalesCalendar transactions={filteredTransactions} expenses={filteredExpenses} />}

      {activeTab === "entry" && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sales Entry</h2>
              <p className="text-sm text-gray-500 mt-1">Record a new transaction into the sales ledger.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={form.customerName}
                onChange={(event) => setForm({ ...form, customerName: event.target.value })}
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
              <select
                value={form.customerType}
                onChange={(event) => setForm({ ...form, customerType: event.target.value as CustomerType })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                <option value="RETAIL">Retail</option>
                <option value="BULK">Bulk</option>
                <option value="AGENT">Agent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pack Size</label>
              <select
                value={form.packSize}
                onChange={(event) => setForm({ ...form, packSize: event.target.value as PackSize })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                <option value="HALF_DOZEN">Half Dozen (6 pads)</option>
                <option value="DOZEN">Dozen (12 pads)</option>
                <option value="CARTON">Carton (60 pads)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={form.quantitySold || ""}
                onChange={(event) =>
                  setForm({ ...form, quantitySold: Number.parseInt(event.target.value, 10) || 0 })
                }
                required
                min={1}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (UGX)</label>
              <input
                type="number"
                value={form.unitPrice || ""}
                onChange={(event) =>
                  setForm({ ...form, unitPrice: Number.parseInt(event.target.value, 10) || 0 })
                }
                required
                min={0}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <input
                type="number"
                value={totalAmount}
                readOnly
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={form.paymentMethod}
                onChange={(event) => setForm({ ...form, paymentMethod: event.target.value as PaymentMethod })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salesperson</label>
              <select
                value={form.salespersonId}
                onChange={(event) => setForm({ ...form, salespersonId: event.target.value })}
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Select...</option>
                {salespersonEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gray-900 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Record Sale"}
            </button>
          </div>
        </form>
      )}
    </div>
    </RouteGuard>
  );
}
