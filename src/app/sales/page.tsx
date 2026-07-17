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
  CustomerCategory,
  CustomerSubType,
  CustomerType,
  Expense,
  PackSize,
  PackVariant,
  PACK_SIZES,
  PaymentMethod,
  SaleTransaction,
  SalesTarget,
  Batch,
} from "@/types";
import { useCollectionQuery } from "@/hooks/use-firestore-query";
import { ReportCard } from "@/components/reports/ReportCard";
import { ChartCard } from "@/components/ui/ChartCard";
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
type AnalyticsPeriod = "day" | "week" | "month" | "12months" | "custom";
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
    case "day": {
      return { start: todayStr, end: todayStr };
    }
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

const EXPECTED_PRICES: Record<PackSize, number> = {
  HALF_DOZEN: 72000,
  DOZEN: 144000,
  CARTON: 1440000,
  ONE_PACK: 12000,
};

const ONE_PACK_VARIANT_PRICES: Record<Exclude<PackVariant, "">, number> = {
  MAX: 13000,
  STANDARD: 12000,
};

function getExpectedPrice(packSize: PackSize, packVariant?: PackVariant): number {
  if (packSize === "ONE_PACK" && packVariant === "MAX") {
    return ONE_PACK_VARIANT_PRICES.MAX;
  }
  if (packSize === "ONE_PACK" && packVariant === "STANDARD") {
    return ONE_PACK_VARIANT_PRICES.STANDARD;
  }
  return EXPECTED_PRICES[packSize];
}



export default function SalesPage() {
  const { userRole } = useAuth();
  const [transactions, setTransactions] = useState<SaleTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const [padsInput, setPadsInput] = useState(0);

  const [form, setForm] = useState({
    date: getDateKey(),
    customerName: "",
    customerType: "RETAIL" as CustomerType,
    customerCategory: "" as CustomerCategory | "",
    customerSubType: "" as CustomerSubType | "",
    packSize: "HALF_DOZEN" as PackSize,
    packVariant: "" as PackVariant,
    quantitySold: 0,
    unitPrice: 0,
    paymentMethod: "CASH" as PaymentMethod,
    salespersonId: "",
    notes: "",
    batchRef: "",
  });

  const [recentSale, setRecentSale] = useState<{
    date: string;
    customerName: string;
    customerType: CustomerType;
    batchRef: string;
    batchNumber: string;
    packSize: PackSize;
    packVariant: PackVariant;
    quantitySold: number;
    salespersonId: string;
    salespersonName: string;
  } | null>(null);

  const { data: employees = [] } = useCollectionQuery<{ id: string; name: string; role: string; department: string }>("employees", [
    orderBy("name"),
  ], { staleTime: 10 * 60 * 1000 });

  const { data: batches = [] } = useCollectionQuery<Batch>("batches", [
    orderBy("startDate", "desc"),
  ], { staleTime: 2 * 60 * 1000 });

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

  const totalRevenue = useMemo(
    () => filteredTransactions.reduce((s, t) => s + t.totalAmount, 0),
    [filteredTransactions]
  );

  const totalSalesCount = filteredTransactions.length;

  const totalPadsSold = useMemo(
    () => filteredTransactions.reduce((s, t) => s + t.quantitySold * PACK_SIZES[t.packSize], 0),
    [filteredTransactions]
  );

  const totalCustomers = useMemo(() => {
    const unique = new Set(filteredTransactions.map((t) => t.customerName));
    return unique.size;
  }, [filteredTransactions]);

  const newCustomers = useMemo(() => {
    const periodStart = periodBounds.start;
    const periodCustomers = filteredTransactions.map((t) => t.customerName);
    const beforePeriodCustomers = new Set(
      transactions
        .filter((t) => t.date < periodStart)
        .map((t) => t.customerName)
    );
    return periodCustomers.filter((name) => !beforePeriodCustomers.has(name)).length;
  }, [filteredTransactions, transactions, periodBounds.start]);

  const b2bCount = useMemo(
    () => filteredTransactions.filter((t) => t.customerCategory === "B2B").length,
    [filteredTransactions]
  );

  const b2cCount = useMemo(
    () => filteredTransactions.filter((t) => t.customerCategory === "B2C").length,
    [filteredTransactions]
  );

  const discountedPacksCount = useMemo(
    () => filteredTransactions
      .filter((t) => t.unitPrice < getExpectedPrice(t.packSize, t.packVariant))
      .reduce((sum, t) => sum + t.quantitySold, 0),
    [filteredTransactions]
  );

  const totalPacksSold = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.quantitySold, 0),
    [filteredTransactions]
  );

  const averageDiscountPercent = useMemo(() => {
    if (filteredTransactions.length === 0) return 0;
    const total = filteredTransactions.reduce((sum, t) => {
      const expected = getExpectedPrice(t.packSize, t.packVariant);
      if (t.unitPrice >= expected) return sum;
      return sum + ((expected - t.unitPrice) / expected) * 100;
    }, 0);
    return total / filteredTransactions.length;
  }, [filteredTransactions]);

  const last7DaysRevenue = useMemo(() => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      data.push(filteredTransactions.filter((t) => t.date === key).reduce((s, t) => s + t.totalAmount, 0));
    }
    return data;
  }, [filteredTransactions]);

  const last7DaysSalesCount = useMemo(() => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      data.push(filteredTransactions.filter((t) => t.date === key).length);
    }
    return data;
  }, [filteredTransactions]);

  const packSizeBreakdown = useMemo(() => {
    const hd = filteredTransactions.filter((t) => t.packSize === "HALF_DOZEN").reduce((s, t) => s + t.quantitySold, 0);
    const dz = filteredTransactions.filter((t) => t.packSize === "DOZEN").reduce((s, t) => s + t.quantitySold, 0);
    const ct = filteredTransactions.filter((t) => t.packSize === "CARTON").reduce((s, t) => s + t.quantitySold, 0);
    const op = filteredTransactions.filter((t) => t.packSize === "ONE_PACK").reduce((s, t) => s + t.quantitySold, 0);
    const total = hd + dz + ct + op || 1;
    return [
      { name: "½ Doz", value: hd, pct: (hd / total) * 100, color: "#EF4444" },
      { name: "Doz", value: dz, pct: (dz / total) * 100, color: "#3B82F6" },
      { name: "Carton", value: ct, pct: (ct / total) * 100, color: "#84CC16" },
      { name: "1 Pack", value: op, pct: (op / total) * 100, color: "#A855F7" },
    ];
  }, [filteredTransactions]);

  const customerTypeSplit = useMemo(() => {
    const retail = filteredTransactions.filter((t) => t.customerType === "RETAIL").reduce((s, t) => s + t.totalAmount, 0);
    const bulk = filteredTransactions.filter((t) => t.customerType === "BULK").reduce((s, t) => s + t.totalAmount, 0);
    const agent = filteredTransactions.filter((t) => t.customerType === "AGENT").reduce((s, t) => s + t.totalAmount, 0);
    const total = retail + bulk + agent || 1;
    return [
      { name: "Retail", value: retail, pct: (retail / total) * 100, color: "#F97316" },
      { name: "Bulk", value: bulk, pct: (bulk / total) * 100, color: "#22C55E" },
      { name: "Agent", value: agent, pct: (agent / total) * 100, color: "#A855F7" },
    ];
  }, [filteredTransactions]);

  const discountedRatio = useMemo(() => {
    const disc = discountedPacksCount;
    const full = Math.max(0, totalPacksSold - disc);
    const total = disc + full || 1;
    return { discounted: disc, fullPrice: full, discountedPct: (disc / total) * 100, fullPct: (full / total) * 100 };
  }, [discountedPacksCount, totalPacksSold]);

  type DiscountByPack = Record<PackSize, number> & { topPack: string };

  const discountByPack = useMemo((): DiscountByPack => {
    const discounts: Record<string, number> = { HALF_DOZEN: 0, DOZEN: 0, CARTON: 0, ONE_PACK: 0 };
    filteredTransactions.forEach((t) => {
      const expected = getExpectedPrice(t.packSize, t.packVariant);
      if (t.unitPrice < expected) {
        discounts[t.packSize] += (expected - t.unitPrice) * t.quantitySold;
      }
    });
    const entries = Object.entries(discounts).filter(([, v]) => v > 0);
    const topPack = entries.length === 0 ? "None" : entries.sort((a, b) => b[1] - a[1])[0][0];
    return { HALF_DOZEN: discounts.HALF_DOZEN, DOZEN: discounts.DOZEN, CARTON: discounts.CARTON, ONE_PACK: discounts.ONE_PACK, topPack };
  }, [filteredTransactions]);

  const { data: salesTargets = [] } = useCollectionQuery<SalesTarget>("salesTargets", [
    orderBy("createdAt", "desc"),
  ], { staleTime: 30 * 1000 });

  const totalAmount = form.quantitySold * form.unitPrice;
  const expectedPrice = getExpectedPrice(form.packSize, form.packVariant);
  const expectedTotal = form.quantitySold * expectedPrice;
  const formDiscountAmount = Math.max(0, expectedTotal - totalAmount);
  const formDiscountPercent = expectedTotal > 0 ? (formDiscountAmount / expectedTotal) * 100 : 0;

  const salespersonEmployees = useMemo(
    () => employees.filter((e) => e.department === "SALES"),
    [employees]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFormSuccess(false);
    try {
      if (editingId) {
        await updateDoc(doc(db, "saleTransactions", editingId), {
          ...form,
          totalAmount,
        });
      } else {
        await addDoc(collection(db, "saleTransactions"), {
          ...form,
          totalAmount,
          createdAt: Timestamp.now(),
        });
      }
      if (!editingId) {
        const salesperson = employees.find((e) => e.id === form.salespersonId);
        const batch = batches.find((b) => b.id === form.batchRef);
        setRecentSale({
          date: form.date,
          customerName: form.customerName,
          customerType: form.customerType,
          batchRef: form.batchRef,
          batchNumber: batch?.batchNumber || "",
          packSize: form.packSize,
          packVariant: form.packVariant,
          quantitySold: form.quantitySold,
          salespersonId: form.salespersonId,
          salespersonName: salesperson?.name || form.salespersonId,
        });
      }
      setPadsInput(0);
      setEditingId(null);
      setForm({
        date: getDateKey(),
        customerName: "",
        customerType: "RETAIL",
        customerCategory: "",
        customerSubType: "",
        packSize: "HALF_DOZEN",
        packVariant: "",
        quantitySold: 0,
        unitPrice: 0,
        paymentMethod: "CASH",
        salespersonId: "",
        notes: "",
        batchRef: "",
      });
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 5000);
    } catch (err) {
      console.error("Failed to save sale:", err);
      const msg = err instanceof Error ? err.message : "Failed to save sale. Please check your permissions and try again.";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSale = (t: SaleTransaction) => {
    setEditingId(t.id);
    setForm({
      date: t.date,
      customerName: t.customerName,
      customerType: t.customerType,
      customerCategory: t.customerCategory || "",
      customerSubType: t.customerSubType || "",
      packSize: t.packSize,
      packVariant: t.packVariant || "",
      quantitySold: t.quantitySold,
      unitPrice: t.unitPrice,
      paymentMethod: t.paymentMethod,
      salespersonId: t.salespersonId,
      notes: t.notes || "",
      batchRef: t.batchRef || "",
    });
    setPadsInput(t.quantitySold * PACK_SIZES[t.packSize]);
    setActiveTab("entry");
    setFormError("");
    setFormSuccess(false);
  };

  const handleDeleteSale = async (id: string) => {
    if (!confirm("Delete this sale entry? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "saleTransactions", id));
    } catch (err) {
      console.error("Failed to delete sale:", err);
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
                {analyticsPeriod === "day" ? "Today" : analyticsPeriod === "week" ? "Last 7 days" : analyticsPeriod === "month" ? "Last 30 days" : analyticsPeriod === "12months" ? "Last 12 months" : "Custom period"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(["day", "week", "month", "12months", "custom"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setAnalyticsPeriod(p)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                      analyticsPeriod === p ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {p === "day" ? "Day" : p === "week" ? "Week" : p === "month" ? "Month" : p === "12months" ? "12 Months" : "Custom"}
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

          {/* Row 1: Revenue, Sales, Products Sold */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ChartCard title="Total Revenue">
              <p className="text-2xl font-bold text-gray-900">UGX {totalRevenue.toLocaleString()}</p>
              {last7DaysRevenue.length > 0 && (
                <div className="mt-2 w-full" style={{ height: 50 }}>
                  <svg width="100%" height="50" viewBox="0 0 100 50" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="revSparkGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="#F97316" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#FBBF24" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const max = Math.max(...last7DaysRevenue, 1);
                      const pts = last7DaysRevenue.map((v, i) => `${(i / (last7DaysRevenue.length - 1)) * 100},${50 - (v / max) * 42}`).join(" ");
                      const barColors = ["#EF4444", "#F97316", "#FBBF24", "#84CC16", "#3B82F6", "#A855F7", "#EC4899"];
                      return (
                        <>
                          <polygon points={`0,50 ${pts} 100,50`} fill="url(#revSparkGrad)" />
                          <polyline points={pts} fill="none" stroke="#F97316" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                          {last7DaysRevenue.map((v, i) => (
                            <circle key={i} cx={(i / (last7DaysRevenue.length - 1)) * 100} cy={50 - (v / max) * 42} r={2} fill={barColors[i]} stroke="#fff" strokeWidth={0.5} />
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
            </ChartCard>
            <ChartCard title="Total Sales">
              <p className="text-2xl font-bold text-gray-900">{totalSalesCount}</p>
              {last7DaysSalesCount.length > 0 && (
                <div className="mt-2 w-full" style={{ height: 50 }}>
                  <svg width="100%" height="50" viewBox="0 0 100 50" preserveAspectRatio="none">
                    {(() => {
                      const max = Math.max(...last7DaysSalesCount, 1);
                      const barW = 80 / last7DaysSalesCount.length;
                      const barColors = ["#EF4444", "#F97316", "#FBBF24", "#84CC16", "#3B82F6", "#A855F7", "#EC4899"];
                      return last7DaysSalesCount.map((v, i) => {
                        const h = (v / max) * 42;
                        const x = 10 + i * barW;
                        return (
                          <rect key={i} x={x} y={50 - h} width={Math.max(barW - 2, 4)} height={Math.max(h, 2)} rx={2} fill={barColors[i % barColors.length]} opacity={0.85} />
                        );
                      });
                    })()}
                  </svg>
                </div>
              )}
            </ChartCard>
            <ChartCard title="Products Sold (Pads)">
              <p className="text-2xl font-bold text-gray-900">{totalPadsSold.toLocaleString()}</p>
              <div className="mt-3 space-y-2">
                {packSizeBreakdown.map((p) => (
                  <div key={p.name}>
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span className="text-gray-500">{p.name}</span>
                      <span className="text-gray-800">{p.value.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Row 2: Customers, New Customers, B2C vs B2B */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ChartCard title="Total Customers">
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="shrink-0" style={{ width: 56, height: 56 }}>
                  <svg width="56" height="56" viewBox="0 0 56 56">
                    {(() => {
                      const cx = 28, cy = 28, r = 22, circ = 2 * Math.PI * r;
                      let offset = 0;
                      return customerTypeSplit.map((s) => {
                        const seg = (s.pct / 100) * circ;
                        const dash = `${seg} ${circ - seg}`;
                        const rot = (offset / circ) * 360 - 90;
                        offset += seg;
                        return (
                          <circle key={s.name} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={5} strokeDasharray={dash} strokeLinecap="round" transform={`rotate(${rot} ${cx} ${cy})`} opacity={0.9} />
                        );
                      });
                    })()}
                  </svg>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  {customerTypeSplit.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="font-semibold text-gray-500">{s.name}</span>
                      </div>
                      <span className="font-bold text-gray-800">{s.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
            <ChartCard title="New Customers">
              <p className="text-2xl font-bold text-gray-900">{newCustomers}</p>
              <div className="mt-2 w-full" style={{ height: 50 }}>
                <svg width="100%" height="50" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="custGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#A855F7" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const growthData = last7DaysSalesCount.map((_, i) => {
                      const slice = last7DaysSalesCount.slice(0, i + 1);
                      const unique = new Set<string>();
                      slice.forEach((_, j) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - j));
                        const key = d.toISOString().split("T")[0];
                        filteredTransactions.filter((t) => t.date === key).forEach((t) => unique.add(t.customerName));
                      });
                      return unique.size;
                    });
                    const max = Math.max(...growthData, 1);
                    const pts = growthData.map((v, i) => `${(i / (growthData.length - 1)) * 100},${50 - (v / max) * 42}`).join(" ");
                    const dotColors = ["#EF4444", "#F97316", "#FBBF24", "#84CC16", "#3B82F6", "#A855F7", "#EC4899"];
                    return (
                      <>
                        <polygon points={`0,50 ${pts} 100,50`} fill="url(#custGrad)" />
                        <polyline points={pts} fill="none" stroke="#3B82F6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                        {growthData.map((v, i) => (
                          <circle key={i} cx={(i / (growthData.length - 1)) * 100} cy={50 - (v / max) * 42} r={2} fill={dotColors[i % dotColors.length]} stroke="#fff" strokeWidth={0.5} />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </ChartCard>
            <ChartCard title="B2C vs B2B">
              {(() => {
                const total = b2bCount + b2cCount;
                const b2cPct = total > 0 ? (b2cCount / total) * 100 : 0;
                const b2bPct = total > 0 ? (b2bCount / total) * 100 : 0;
                const max = Math.max(b2cCount, b2bCount, 1);
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: "#EF4444" }} />
                          <span className="text-gray-600">B2C</span>
                        </div>
                        <span className="text-gray-900">{b2cCount} ({b2cPct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(b2cCount / max) * 100}%`, backgroundColor: "#EF4444" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: "#3B82F6" }} />
                          <span className="text-gray-600">B2B</span>
                        </div>
                        <span className="text-gray-900">{b2bCount} ({b2bPct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(b2bCount / max) * 100}%`, backgroundColor: "#3B82F6" }} />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </ChartCard>
          </div>

          {/* Row 3: Discount Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ChartCard title="Discounted Packs">
              <p className="text-2xl font-bold text-gray-900">{discountedPacksCount}</p>
              <p className="text-xs text-gray-400 mt-1">out of {totalPacksSold} total packs sold</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="shrink-0" style={{ width: 48, height: 48 }}>
                  <svg width="48" height="48" viewBox="0 0 48 48">
                    {(() => {
                      const cx = 24, cy = 24, r = 18, circ = 2 * Math.PI * r;
                      const discSeg = (discountedRatio.discountedPct / 100) * circ;
                      const fullSeg = (discountedRatio.fullPct / 100) * circ;
                      return (
                        <>
                          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={4} />
                          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FBBF24" strokeWidth={4} strokeDasharray={`${discSeg} ${circ - discSeg}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} opacity={0.9} />
                          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22C55E" strokeWidth={4} strokeDasharray={`${fullSeg} ${circ - fullSeg}`} strokeLinecap="round" transform={`rotate(${(discountedRatio.discountedPct / 100) * 360 - 90} ${cx} ${cy})`} opacity={0.9} />
                        </>
                      );
                    })()}
                  </svg>
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#FBBF24" }} />
                      <span className="font-semibold text-gray-500">Discounted</span>
                    </div>
                    <span className="font-bold text-gray-800">{discountedRatio.discountedPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#22C55E" }} />
                      <span className="font-semibold text-gray-500">Full Price</span>
                    </div>
                    <span className="font-bold text-gray-800">{discountedRatio.fullPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </ChartCard>
            <ChartCard title="Average Discount">
              <p className="text-2xl font-bold text-gray-900">{averageDiscountPercent.toFixed(1)}%</p>
              <p className="text-xs text-gray-400 mt-1">across all products</p>
              <div className="mt-2 flex justify-center" style={{ height: 52 }}>
                <svg width="100" height="52" viewBox="0 0 100 52">
                  {(() => {
                    const pct = Math.min(averageDiscountPercent, 100);
                    const circ = Math.PI * 38;
                    const dash = (pct / 100) * circ;
                    const color = pct >= 20 ? "#EF4444" : pct >= 10 ? "#F97316" : "#FBBF24";
                    return (
                      <>
                        <path d={`M 6 50 A 44 44 0 0 1 94 50`} fill="none" stroke="#f1f5f9" strokeWidth={8} strokeLinecap="round" />
                        <path d={`M 6 50 A 44 44 0 0 1 94 50`} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} style={{ transition: "stroke-dashoffset 1s ease" }} />
                      </>
                    );
                  })()}
                </svg>
              </div>
            </ChartCard>
            <ChartCard title="Discount by Pack Size">
              <p className="text-xs text-gray-400 mb-2">Total discount value per pack type</p>
              <div className="space-y-2">
                {([
                  { key: "HALF_DOZEN" as const, label: "Half Dozen", color: "#F97316" },
                  { key: "DOZEN" as const, label: "Dozen", color: "#3B82F6" },
                  { key: "CARTON" as const, label: "Carton", color: "#FBBF24" },
                  { key: "ONE_PACK" as const, label: "1 Pack", color: "#A855F7" },
                ]).map((p) => {
                  const val = discountByPack[p.key];
                  const maxVal = Math.max(discountByPack.HALF_DOZEN, discountByPack.DOZEN, discountByPack.CARTON, discountByPack.ONE_PACK, 1);
                  const barPct = (val / maxVal) * 100;
                  const isTop = discountByPack.topPack === p.key;
                  return (
                    <div key={p.key}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className={`font-semibold ${isTop ? "text-gray-900" : "text-gray-500"}`}>
                          {p.label} {isTop && "★"}
                        </span>
                        <span className={`font-bold ${isTop ? "text-gray-900" : "text-gray-600"}`}>
                          UGX {val.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: p.color, opacity: isTop ? 1 : 0.5 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>

          {recentSale && (
            <ChartCard
              title="Move to Stock Out"
              subtitle="Recent sale ready for stock-out recording"
              variant="gradient"
              accentColor="#f43f5e"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="text-gray-500 text-xs">Date</div>
                  <div className="text-gray-900 text-xs font-semibold">{recentSale.date}</div>
                  <div className="text-gray-500 text-xs">Customer</div>
                  <div className="text-gray-900 text-xs font-semibold">{recentSale.customerName}</div>
                  <div className="text-gray-500 text-xs">Batch</div>
                  <div className="text-gray-900 text-xs font-semibold">{recentSale.batchNumber || "—"}</div>
                  <div className="text-gray-500 text-xs">Pack</div>
                  <div className="text-gray-900 text-xs font-semibold">
                    {recentSale.packSize === "HALF_DOZEN" ? "Half Dozen" : recentSale.packSize === "DOZEN" ? "Dozen" : recentSale.packSize === "CARTON" ? "Carton" : recentSale.packVariant === "MAX" ? "1 Pack Max" : "1 Pack Standard"}
                  </div>
                  <div className="text-gray-500 text-xs">Qty</div>
                  <div className="text-gray-900 text-xs font-semibold">{recentSale.quantitySold}</div>
                  <div className="text-gray-500 text-xs">Destination</div>
                  <div className="text-gray-900 text-xs font-semibold">
                    {recentSale.customerType === "BULK" ? "Bulk Customer" : recentSale.customerType === "RETAIL" ? "Retail" : "Agent"}
                  </div>
                  <div className="text-gray-500 text-xs">Dispatched By</div>
                  <div className="text-gray-900 text-xs font-semibold">{recentSale.salespersonName}</div>
                </div>
                <button
                  onClick={() => {
                    const params = new URLSearchParams({
                      tab: "stock-out",
                      date: recentSale.date,
                      customerRef: recentSale.customerName,
                      destination: recentSale.customerType === "BULK" ? "BULK_CUSTOMER" : recentSale.customerType,
                      packSize: recentSale.packSize,
                      quantity: String(recentSale.quantitySold),
                      dispatchedBy: recentSale.salespersonId,
                      customerName: recentSale.customerName,
                    });
                    if (recentSale.batchRef) params.set("batchRef", recentSale.batchRef);
                    setRecentSale(null);
                    window.location.href = `/storage?${params.toString()}`;
                  }}
                  className="w-full py-2 px-4 bg-rose-500 text-white text-sm font-medium rounded-md hover:bg-rose-600 transition"
                >
                  Move to Stock Out →
                </button>
              </div>
            </ChartCard>
          )}

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

          {/* Sales List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Sales List</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""} in this period
                </p>
              </div>
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pack</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salesperson</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No transactions in this period.</td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{t.date}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{t.customerName}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {t.packSize === "HALF_DOZEN" ? "Half Dozen" : t.packSize === "DOZEN" ? "Dozen" : t.packSize === "CARTON" ? "Carton" : t.packVariant === "MAX" ? "1 Pack Max" : "1 Pack Std"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">{t.quantitySold}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">UGX {t.totalAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {t.paymentMethod === "CASH" ? "Cash" : t.paymentMethod === "MOBILE_MONEY" ? "M.Money" : "Bank Transfer"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{employees.find((e) => e.id === t.salespersonId)?.name || t.salespersonId}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => handleEditSale(t)} className="text-xs font-medium text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                          <button onClick={() => handleDeleteSale(t.id)} className="text-xs font-medium text-red-600 hover:text-red-800">Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Sale" : "Sales Entry"}</h2>
              <p className="text-sm text-gray-500 mt-1">{editingId ? "Update the details of this transaction." : "Record a new transaction into the sales ledger."}</p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setPadsInput(0);
                  setForm({
                    date: getDateKey(),
                    customerName: "",
                    customerType: "RETAIL",
                    customerCategory: "",
                    customerSubType: "",
                    packSize: "HALF_DOZEN",
                    packVariant: "",
                    quantitySold: 0,
                    unitPrice: 0,
                    paymentMethod: "CASH",
                    salespersonId: "",
                    notes: "",
                    batchRef: "",
                  });
                  setFormError("");
                }}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md px-3 py-1.5"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-xl">
              Sale recorded successfully.
            </div>
          )}

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Channel</label>
              <select
                value={form.customerCategory}
                onChange={(event) => setForm({ ...form, customerCategory: event.target.value as CustomerCategory })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Select...</option>
                <option value="B2B">B2B (Business)</option>
                <option value="B2C">B2C (Consumer)</option>
              </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Sub-Type</label>
              <select
                value={form.customerSubType}
                onChange={(event) => setForm({ ...form, customerSubType: event.target.value as CustomerSubType })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Select...</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="PRIVATE_COMPANY">Private Company</option>
                <option value="NON_PROFIT">Non-Profit Organization</option>
                <option value="RETAILER">Retailer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pack Size</label>
              <select
                value={form.packSize}
                onChange={(event) => {
                  const newPackSize = event.target.value as PackSize;
                  const newVariant: PackVariant = newPackSize === "ONE_PACK" ? "STANDARD" : "";
                  const newExpected = getExpectedPrice(newPackSize, newVariant);
                  setForm({ ...form, packSize: newPackSize, packVariant: newVariant, quantitySold: padsInput / PACK_SIZES[newPackSize], unitPrice: newPackSize === "ONE_PACK" ? newExpected : form.unitPrice });
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                <option value="HALF_DOZEN">Half Dozen (6 pads/pack)</option>
                <option value="DOZEN">Dozen (12 pads/pack)</option>
                <option value="CARTON">Carton (120 pads/pack)</option>
                <option value="ONE_PACK">1 Pack (3 pads/pack)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Expected price: UGX {expectedPrice.toLocaleString()} per pack
              </p>
            </div>
            {form.packSize === "ONE_PACK" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pack Variant</label>
                <select
                  value={form.packVariant}
                  onChange={(event) => {
                    const newVariant = event.target.value as PackVariant;
                    const newExpected = getExpectedPrice(form.packSize, newVariant);
                    setForm({ ...form, packVariant: newVariant, unitPrice: newExpected });
                  }}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="STANDARD">Standard 3 pads — UGX 12,000</option>
                  <option value="MAX">Max 3 pads — UGX 13,000</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Pads</label>
              <input
                type="number"
                value={padsInput || ""}
                onChange={(event) => {
                  const pads = Number.parseFloat(event.target.value) || 0;
                  setPadsInput(pads);
                  setForm((f) => ({ ...f, quantitySold: pads / PACK_SIZES[f.packSize] }));
                }}
                required
                min={1}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Packs</label>
              <input
                type="number"
                value={padsInput > 0 ? form.quantitySold : ""}
                readOnly
                step="any"
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
              {padsInput > 0 && (() => {
                const totalPads = Math.round(padsInput);
                const packSize = PACK_SIZES[form.packSize];
                const fullPacks = Math.floor(padsInput / packSize);
                const remainingPads = padsInput % packSize;
                const packLabel = form.packSize === "HALF_DOZEN" ? "half-dozen" : form.packSize === "DOZEN" ? "dozen" : form.packSize === "CARTON" ? "carton" : "1-pack";
                return (
                  <p className="mt-1 text-xs text-gray-500">
                    {fullPacks > 0 && `${fullPacks} full ${packLabel} pack${fullPacks > 1 ? "s" : ""} (${fullPacks * packSize} pads)`}
                    {fullPacks > 0 && remainingPads > 0 && " + "}
                    {remainingPads > 0 && `${remainingPads} individual pad${remainingPads > 1 ? "s" : ""}`}
                    {" = "}{padsInput} total pad{padsInput > 1 ? "s" : ""}
                  </p>
                );
              })()}
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
              {form.unitPrice > 0 && form.unitPrice < expectedPrice && (
                <p className="mt-1 text-xs text-amber-600">
                  Discount: UGX {formDiscountAmount.toLocaleString()} ({formDiscountPercent.toFixed(1)}% off)
                </p>
              )}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <select
                value={form.batchRef}
                onChange={(event) => setForm({ ...form, batchRef: event.target.value })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Select batch (optional)...</option>
                {batches.filter((b) => b.status === "ACTIVE").map((b) => (
                  <option key={b.id} value={b.id}>{b.batchNumber} — {b.packsProduced.toLocaleString()} / {b.maxPacks.toLocaleString()} packs</option>
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
              {saving ? "Saving..." : editingId ? "Update Sale" : "Record Sale"}
            </button>
          </div>
        </form>
      )}
    </div>
    </RouteGuard>
  );
}
