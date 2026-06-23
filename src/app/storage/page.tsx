"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { StockIn, StockOut, PackSize, Batch, ProductionEntry, SaleTransaction, StageId } from "@/types";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { PACK_SIZES } from "@/types";
import { useCollectionQuery } from "@/hooks/use-firestore-query";
import { ChartCard } from "@/components/ui/ChartCard";
import { RadialProgress } from "@/components/ui/RadialProgress";
import { PieWithLegendChart } from "@/components/charts/PieWithLegendChart";
import { VerticalBarChart } from "@/components/charts/VerticalBarChart";
import { CalendarHeatmap } from "@/components/charts/CalendarHeatmap";
import { palette } from "@/components/charts";
import { ReportCard } from "@/components/reports/ReportCard";
import type { PeriodSelection } from "@/components/reports/PeriodSelector";

const PADS_PER_PACK = 3;

type StoragePeriod = "today" | "week" | "month" | "12months" | "custom";

function getStoragePeriodBounds(period: StoragePeriod, customStart?: string, customEnd?: string) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  switch (period) {
    case "today":
      return { start: todayStr, end: todayStr };
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
    case "custom":
      return { start: customStart || todayStr, end: customEnd || todayStr };
  }
}

export default function StoragePage() {
  const { userRole } = useAuth();
  const isSupervisor = userRole?.role === "PRODUCTION_SUPERVISOR";
  const [activeTab, setActiveTab] = useState<"dashboard" | "stock-in" | "stock-out" | "wip" | "analytics">("dashboard");
  const [saving, setSaving] = useState(false);

  const visibleTabs = useMemo(() => {
    const allTabs = ["dashboard", "stock-in", "stock-out", "wip", "analytics"] as const;
    if (isSupervisor) return allTabs.filter((t) => t !== "stock-out");
    return allTabs;
  }, [isSupervisor]);

  const handleTabChange = (tab: typeof activeTab) => {
    if (isSupervisor && tab === "stock-out") return;
    setActiveTab(tab);
  };

  const [moveEntryId, setMoveEntryId] = useState<string | null>(null);
  const [storagePeriod, setStoragePeriod] = useState<StoragePeriod>("month");
  const [storageCustomStart, setStorageCustomStart] = useState("");
  const [storageCustomEnd, setStorageCustomEnd] = useState("");
  const [stockOutPeriod, setStockOutPeriod] = useState<StoragePeriod>("month");
  const [stockOutCustomStart, setStockOutCustomStart] = useState("");
  const [stockOutCustomEnd, setStockOutCustomEnd] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const dateParam = params.get("date");
    const quantityParam = params.get("quantity");
    const batchRefParam = params.get("batchRef");
    const entryIdParam = params.get("entryId");
    if (tabParam === "stock-in") {
      setActiveTab("stock-in");
    }
    if (dateParam || quantityParam || batchRefParam) {
      setStockInForm((prev) => ({
        ...prev,
        date: dateParam || prev.date,
        quantity: quantityParam ? parseInt(quantityParam, 10) || 0 : prev.quantity,
        batchRef: batchRefParam || prev.batchRef,
      }));
    }
    if (entryIdParam) {
      setMoveEntryId(entryIdParam);
    }
  }, []);

  const [stockInForm, setStockInForm] = useState({
    date: new Date().toISOString().split("T")[0],
    batchRef: "",
    packSize: "HALF_DOZEN" as PackSize,
    quantity: 0,
    receivedBy: "",
    notes: "",
  });

  const [stockOutForm, setStockOutForm] = useState({
    date: new Date().toISOString().split("T")[0],
    destination: "",
    customerRef: "",
    batchRef: "",
    packSize: "HALF_DOZEN" as PackSize,
    quantity: 0,
    dispatchedBy: "",
  });

  const { data: stockIns = [] } = useCollectionQuery<StockIn>(
    "stockIns", [orderBy("date", "desc")], { staleTime: 30 * 1000 }
  );

  const { data: stockOuts = [] } = useCollectionQuery<StockOut>(
    "stockOuts", [orderBy("date", "desc")], { staleTime: 30 * 1000 }
  );

  const { data: batches = [] } = useCollectionQuery<Batch>(
    "batches", [orderBy("startDate", "desc")], { staleTime: 2 * 60 * 1000 }
  );

  const { data: employees = [] } = useCollectionQuery<{ id: string; name: string }>(
    "employees", [orderBy("name")], { staleTime: 10 * 60 * 1000 }
  );

  const { data: productionEntries = [] } = useCollectionQuery<ProductionEntry>(
    "productionEntries", [], { staleTime: 60 * 1000 }
  );

  const { data: sales = [] } = useCollectionQuery<SaleTransaction>(
    "saleTransactions", [orderBy("date", "desc")], { staleTime: 60 * 1000 }
  );

  const periodBounds = useMemo(
    () => getStoragePeriodBounds(storagePeriod, storageCustomStart, storageCustomEnd),
    [storagePeriod, storageCustomStart, storageCustomEnd]
  );

  const periodStockIns = useMemo(
    () => stockIns.filter((si) => si.date >= periodBounds.start && si.date <= periodBounds.end),
    [stockIns, periodBounds]
  );

  const periodStockOuts = useMemo(
    () => stockOuts.filter((so) => so.date >= periodBounds.start && so.date <= periodBounds.end),
    [stockOuts, periodBounds]
  );

  const cumulativeStock = useMemo(() => {
    const stock: Record<PackSize, number> = { HALF_DOZEN: 0, DOZEN: 0, CARTON: 0 };
    stockIns.forEach((si) => { stock[si.packSize as PackSize] += si.quantity; });
    stockOuts.forEach((so) => { stock[so.packSize as PackSize] -= so.quantity; });
    return stock;
  }, [stockIns, stockOuts]);

  const cumulativeTotalPads = useMemo(
    () => Object.entries(cumulativeStock).reduce((sum, [size, qty]) => sum + qty * PACK_SIZES[size as PackSize], 0),
    [cumulativeStock]
  );

  const currentStock = useMemo(() => {
    const stock: Record<PackSize, number> = { HALF_DOZEN: 0, DOZEN: 0, CARTON: 0 };
    periodStockIns.forEach((si) => { stock[si.packSize as PackSize] += si.quantity; });
    periodStockOuts.forEach((so) => { stock[so.packSize as PackSize] -= so.quantity; });
    return stock;
  }, [periodStockIns, periodStockOuts]);

  const totalPads = useMemo(
    () => Object.entries(currentStock).reduce((sum, [size, qty]) => sum + qty * PACK_SIZES[size as PackSize], 0),
    [currentStock]
  );

  const activeBatch = useMemo(() => batches.find((b) => b.status === "ACTIVE"), [batches]);

  const batchCompletionPct = useMemo(() => {
    if (!activeBatch) return 0;
    const batchStoredPads = stockIns
      .filter((si) => si.batchRef === activeBatch.id)
      .reduce((sum, si) => sum + si.quantity * PACK_SIZES[si.packSize as PackSize], 0);
    const batchPacksStored = batchStoredPads / PADS_PER_PACK;
    return Math.min(100, Math.round((batchPacksStored / activeBatch.maxPacks) * 100));
  }, [activeBatch, stockIns]);

  const daysOfStock = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
    const recentSales = sales.filter((s) => s.date >= sevenDaysAgoStr);
    const recentSalesPads = recentSales.reduce((sum, s) => sum + s.quantitySold * PACK_SIZES[s.packSize as PackSize], 0);
    const avgDailySales = recentSalesPads / 7;
    return avgDailySales > 0 ? Math.round(cumulativeTotalPads / avgDailySales) : 999;
  }, [sales, cumulativeTotalPads]);

  const stageCounts = useMemo(() => {
    const counts: Record<StageId, number> = {
      "STG-01": 0, "STG-02": 0, "STG-03": 0, "STG-04": 0, "STG-05": 0, "STG-06": 0, "STG-07": 0,
    };
    productionEntries.forEach((e) => { counts[e.stageId] += e.actualPieces; });
    return counts;
  }, [productionEntries]);

  const totalPackagedPads = stageCounts["STG-07"];

  const wipCut = Math.max(0, stageCounts["STG-01"] - stageCounts["STG-02"]);
  const wipSewn = Math.max(0, stageCounts["STG-03"] - stageCounts["STG-04"]);
  const wipOverlocked = Math.max(0, stageCounts["STG-04"] - stageCounts["STG-06"]);
  const wipPouches = Math.max(0, stageCounts["STG-05"] - stageCounts["STG-06"]);
  const wipPinned = Math.max(0, stageCounts["STG-06"] - totalPackagedPads);

  const packsBySizeData = useMemo(() => {
    const bySize: Record<string, number> = {};
    stockIns.forEach((si) => { bySize[si.packSize] = (bySize[si.packSize] || 0) + si.quantity; });
    return Object.entries(bySize).map(([name, value]) => ({
      name: name === "HALF_DOZEN" ? "Half Dozen" : name === "DOZEN" ? "Dozen" : "Carton",
      value,
    }));
  }, [stockIns]);

  const dailyStockInData = useMemo(() => {
    const byDate: Record<string, number> = {};
    stockIns.forEach((si) => {
      const pads = si.quantity * PACK_SIZES[si.packSize as PackSize];
      byDate[si.date] = (byDate[si.date] || 0) + pads;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pads]) => ({ label: date, value: pads }));
  }, [stockIns]);

  const periodDailyStockInData = useMemo(() => {
    const byDate: Record<string, number> = {};
    periodStockIns.forEach((si) => {
      const pads = si.quantity * PACK_SIZES[si.packSize as PackSize];
      byDate[si.date] = (byDate[si.date] || 0) + pads;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pads]) => ({ label: date, value: pads }));
  }, [periodStockIns]);

  const periodStockHeatmapData = useMemo(() => {
    const byDate: Record<string, number> = {};
    periodStockIns.forEach((si) => {
      byDate[si.date] = (byDate[si.date] || 0) + si.quantity * PACK_SIZES[si.packSize as PackSize];
    });
    return Object.entries(byDate).map(([date, value]) => ({ date, value }));
  }, [periodStockIns]);

  const periodRecentActivity = useMemo(() => {
    const activities: { date: string; type: "in" | "out"; label: string; value: number }[] = [];
    periodStockIns.slice(0, 10).forEach((si) => {
      activities.push({ date: si.date, type: "in", label: "Stock In", value: si.quantity * PACK_SIZES[si.packSize as PackSize] });
    });
    periodStockOuts.slice(0, 10).forEach((so) => {
      activities.push({ date: so.date, type: "out", label: "Stock Out", value: so.quantity * PACK_SIZES[so.packSize as PackSize] });
    });
    return activities.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [periodStockIns, periodStockOuts]);

  const stockOutBounds = useMemo(
    () => getStoragePeriodBounds(stockOutPeriod, stockOutCustomStart, stockOutCustomEnd),
    [stockOutPeriod, stockOutCustomStart, stockOutCustomEnd]
  );

  const stockOutPeriodData = useMemo(
    () => stockOuts.filter((so) => so.date >= stockOutBounds.start && so.date <= stockOutBounds.end),
    [stockOuts, stockOutBounds]
  );

  const stockOutPadsDispatched = useMemo(
    () => stockOutPeriodData.reduce((sum, so) => sum + so.quantity * PACK_SIZES[so.packSize as PackSize], 0),
    [stockOutPeriodData]
  );

  const stockOutPacksDispatched = useMemo(
    () => stockOutPeriodData.reduce((sum, so) => sum + so.quantity, 0),
    [stockOutPeriodData]
  );

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const batchDocRef = doc(db, "batches", stockInForm.batchRef);
      await addDoc(collection(db, "stockIns"), { ...stockInForm, createdAt: Timestamp.now() });
      if (moveEntryId) {
        await updateDoc(doc(db, "productionEntries", moveEntryId), {
          movedToStockAt: Timestamp.now(),
        });
        setMoveEntryId(null);
      }
      const batchInsQuery = query(collection(db, "stockIns"), where("batchRef", "==", stockInForm.batchRef));
      const batchInsSnap = await getDocs(batchInsQuery);
      const totalPadsInBatch = batchInsSnap.docs.reduce((sum, d) => {
        const data = d.data();
        return sum + (data.quantity || 0) * PACK_SIZES[data.packSize as PackSize];
      }, 0);
      const packsStored = Math.floor(totalPadsInBatch / PADS_PER_PACK);
      const batchUpdates: Record<string, unknown> = { packsProduced: packsStored };
      if (packsStored >= 10000) {
        batchUpdates.status = "COMPLETE";
        batchUpdates.completionDate = new Date().toISOString().split("T")[0];
      }
      await updateDoc(batchDocRef, batchUpdates);
      setStockInForm({ date: new Date().toISOString().split("T")[0], batchRef: "", packSize: "HALF_DOZEN", quantity: 0, receivedBy: "", notes: "" });
    } finally {
      setSaving(false);
    }
  };

  const handleStockOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "stockOuts"), { ...stockOutForm, createdAt: Timestamp.now() });
      setStockOutForm({ date: new Date().toISOString().split("T")[0], destination: "", customerRef: "", batchRef: "", packSize: "HALF_DOZEN", quantity: 0, dispatchedBy: "" });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateReport = useCallback(async (selection: PeriodSelection) => {
    const params = new URLSearchParams({
      screen: "storage",
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
    a.download = `storage-report-${selection.startDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <RouteGuard>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Storage</h1>
        <div className="flex gap-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === tab ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab === "stock-in" ? "Stock In" : tab === "stock-out" ? "Stock Out" : tab === "wip" ? "WIP Summary" : tab === "analytics" ? "Analytics" : "Dashboard"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" && (
        <>
        <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
            <p className="text-sm text-gray-500">
              {storagePeriod === "today" ? "Today" : storagePeriod === "week" ? "Last 7 days" : storagePeriod === "month" ? "Last 30 days" : storagePeriod === "12months" ? "Last 12 months" : "Custom period"}
            </p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["today", "week", "month", "12months", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setStoragePeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  storagePeriod === p ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                }`}
              >
                {p === "today" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : p === "12months" ? "12 Months" : "Custom"}
              </button>
            ))}
          </div>
        </div>
        {storagePeriod === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={storageCustomStart} onChange={(e) => setStorageCustomStart(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-40" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={storageCustomEnd} onChange={(e) => setStorageCustomEnd(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-40" />
          </div>
        )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title="Half Dozen" subtitle="6-pad packs in period" variant="gradient" accentColor={palette.blue}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-3xl font-bold text-blue-500">{currentStock.HALF_DOZEN.toLocaleString()}</span>
              <span className="text-xs text-gray-400 mt-1">packs</span>
            </div>
          </ChartCard>

          <ChartCard title="Dozen" subtitle="12-pad packs in period" variant="gradient" accentColor={palette.indigo}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-3xl font-bold text-indigo-500">{currentStock.DOZEN.toLocaleString()}</span>
              <span className="text-xs text-gray-400 mt-1">packs</span>
            </div>
          </ChartCard>

          <ChartCard title="Carton" subtitle="120-pad packs in period" variant="gradient" accentColor={palette.purple}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-3xl font-bold text-purple-500">{currentStock.CARTON.toLocaleString()}</span>
              <span className="text-xs text-gray-400 mt-1">packs</span>
            </div>
          </ChartCard>

          <ChartCard title="Total Pads" subtitle="All pack sizes in period" variant="gradient" accentColor={palette.emerald}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-3xl font-bold text-emerald-500">{totalPads.toLocaleString()}</span>
              <span className="text-xs text-gray-400 mt-1">pads in period</span>
            </div>
          </ChartCard>

          <ChartCard title="Batch Completion" subtitle={activeBatch?.batchNumber || "No Active Batch"} variant="gradient">
            <div className="flex-1 flex items-center justify-center pt-2">
              <RadialProgress
                value={batchCompletionPct}
                label={`${batchCompletionPct}%`}
                subLabel="Stored"
                color={batchCompletionPct === 100 ? "#22c55e" : "#3b82f6"}
              />
            </div>
          </ChartCard>

          <ChartCard title="Days of Stock" subtitle="Based on 7-day avg sales" variant="gradient">
            <div className="flex-1 flex items-center justify-center pt-2">
              <RadialProgress
                value={daysOfStock === 999 ? 100 : Math.min((daysOfStock / 30) * 100, 100)}
                label={daysOfStock === 999 ? "\u221E" : String(daysOfStock)}
                subLabel="Days Left"
                color={daysOfStock < 7 ? "#f59e0b" : "#22c55e"}
              />
            </div>
          </ChartCard>

          <VerticalBarChart
            data={periodDailyStockInData}
            series={[{ dataKey: "value", name: "Pads", color: palette.blue }]}
            title="Daily Stock-In"
            subtitle="Pads received per day"
            height={260}
          />

          <CalendarHeatmap
            data={periodStockHeatmapData}
            title="Stock Activity"
            subtitle="Pads received per day"
          />

          <ChartCard title="Recent Activity" subtitle="Latest stock movements" variant="gradient">
            {periodRecentActivity.length > 0 ? (
              <div className="space-y-2">
                {periodRecentActivity.map((a, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${a.type === "in" ? "bg-emerald-400" : "bg-red-400"}`} />
                      <div>
                        <p className="text-xs font-semibold text-gray-700">{a.label}</p>
                        <p className="text-[10px] text-gray-400">{a.date}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold ${a.type === "in" ? "text-emerald-500" : "text-red-500"}`}>
                      {a.type === "in" ? "+" : "-"}{a.value.toLocaleString()} pads
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No activity</div>
            )}
          </ChartCard>
        </div>
      </>)}

      {activeTab === "wip" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Work-In-Progress (WIP) Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ChartCard title="Cut Pieces" subtitle="STG-01" variant="gradient" accentColor={wipCut > 500 ? palette.orange : palette.blue}>
              <div className="flex flex-col items-center justify-center h-full">
                <span className="text-2xl font-bold" style={{ color: wipCut > 500 ? palette.orange : palette.blue }}>{wipCut.toLocaleString()}</span>
                <span className="text-xs text-gray-400 mt-1">pieces in queue</span>
              </div>
            </ChartCard>
            <ChartCard title="Sewn Pads" subtitle="STG-03" variant="gradient" accentColor={wipSewn > 500 ? palette.orange : palette.blue}>
              <div className="flex flex-col items-center justify-center h-full">
                <span className="text-2xl font-bold" style={{ color: wipSewn > 500 ? palette.orange : palette.blue }}>{wipSewn.toLocaleString()}</span>
                <span className="text-xs text-gray-400 mt-1">pads in queue</span>
              </div>
            </ChartCard>
            <ChartCard title="Overlocked" subtitle="STG-04" variant="gradient" accentColor={wipOverlocked > 500 ? palette.orange : palette.blue}>
              <div className="flex flex-col items-center justify-center h-full">
                <span className="text-2xl font-bold" style={{ color: wipOverlocked > 500 ? palette.orange : palette.blue }}>{wipOverlocked.toLocaleString()}</span>
                <span className="text-xs text-gray-400 mt-1">pieces in queue</span>
              </div>
            </ChartCard>
            <ChartCard title="Pouches" subtitle="STG-05" variant="gradient" accentColor={wipPouches > 500 ? palette.orange : palette.blue}>
              <div className="flex flex-col items-center justify-center h-full">
                <span className="text-2xl font-bold" style={{ color: wipPouches > 500 ? palette.orange : palette.blue }}>{wipPouches.toLocaleString()}</span>
                <span className="text-xs text-gray-400 mt-1">pieces in queue</span>
              </div>
            </ChartCard>
            <ChartCard title="Pinned" subtitle="STG-06" variant="gradient" accentColor={wipPinned > 500 ? palette.orange : palette.blue}>
              <div className="flex flex-col items-center justify-center h-full">
                <span className="text-2xl font-bold" style={{ color: wipPinned > 500 ? palette.orange : palette.blue }}>{wipPinned.toLocaleString()}</span>
                <span className="text-xs text-gray-400 mt-1">pieces in queue</span>
              </div>
            </ChartCard>
            <ChartCard title="Total WIP" subtitle="All stages combined" variant="gradient" accentColor={palette.violet}>
              <div className="flex flex-col items-center justify-center h-full">
                <span className="text-2xl font-bold text-violet-500">{(wipCut + wipSewn + wipOverlocked + wipPouches + wipPinned).toLocaleString()}</span>
                <span className="text-xs text-gray-400 mt-1">pieces in progress</span>
              </div>
            </ChartCard>
            <ChartCard title="Packaged" subtitle="STG-07 complete" variant="gradient" accentColor={palette.emerald}>
              <div className="flex flex-col items-center justify-center h-full">
                <span className="text-2xl font-bold text-emerald-500">{totalPackagedPads.toLocaleString()}</span>
                <span className="text-xs text-gray-400 mt-1">pads packaged</span>
              </div>
            </ChartCard>
          </div>
          <p className="text-xs text-gray-500">Orange accent indicates potential bottlenecks where WIP has accumulated above 500.</p>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          <PieWithLegendChart
            data={packsBySizeData.length > 0 ? packsBySizeData.map((d) => ({ name: d.name, value: d.value })) : []}
            title="Production Materials \u2014 Pack Breakdown"
            subtitle="Distribution by pack size"
            height={250}
            innerRadius={60}
            outerRadius={80}
          />
          <VerticalBarChart
            data={dailyStockInData}
            series={[{ dataKey: "value", name: "Pads", color: palette.blue }]}
            title="Daily Stock-In (Pads)"
            subtitle="Total pads received in storage per day"
            height={250}
          />
        </div>
      )}

      {activeTab === "stock-in" && (
        <form onSubmit={handleStockInSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Stock-In Entry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={stockInForm.date} onChange={(e) => setStockInForm({ ...stockInForm, date: e.target.value })}
                required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <div className="flex gap-2">
                <select value={stockInForm.batchRef} onChange={(e) => setStockInForm({ ...stockInForm, batchRef: e.target.value })}
                  required className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="">Select batch...</option>
                  {batches.filter((b) => b.status === "ACTIVE").map((b) => (
                    <option key={b.id} value={b.id}>{b.batchNumber} — {b.packsProduced.toLocaleString()} / {b.maxPacks.toLocaleString()} packs</option>
                  ))}
                </select>
                <button type="button" onClick={() => window.open("/production/batches", "_blank")}
                  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 whitespace-nowrap">+ New</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pack Size</label>
              <select value={stockInForm.packSize} onChange={(e) => setStockInForm({ ...stockInForm, packSize: e.target.value as PackSize })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="HALF_DOZEN">Half Dozen (6 Packs)</option>
                <option value="DOZEN">Dozen (12 Packs)</option>
                <option value="CARTON">Carton (120 packs)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" value={stockInForm.quantity || ""} onChange={(e) => setStockInForm({ ...stockInForm, quantity: parseInt(e.target.value) || 0 })}
                required min={1} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received By</label>
              <select value={stockInForm.receivedBy} onChange={(e) => setStockInForm({ ...stockInForm, receivedBy: e.target.value })}
                required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">Select...</option>
                {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input type="text" value={stockInForm.notes} onChange={(e) => setStockInForm({ ...stockInForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Optional" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="py-2 px-6 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50">
              {saving ? "Saving..." : "Record Stock-In"}
            </button>
          </div>
        </form>
      )}

      {activeTab === "stock-out" && (
        <>
        <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Stock-Out Metrics</h2>
            <p className="text-sm text-gray-500">
              {stockOutPeriod === "today" ? "Today" : stockOutPeriod === "week" ? "Last 7 days" : stockOutPeriod === "month" ? "Last 30 days" : stockOutPeriod === "12months" ? "Last 12 months" : "Custom period"}
            </p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["today", "week", "month", "12months", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setStockOutPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  stockOutPeriod === p ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                }`}
              >
                {p === "today" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : p === "12months" ? "12 Months" : "Custom"}
              </button>
            ))}
          </div>
        </div>
        {stockOutPeriod === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={stockOutCustomStart} onChange={(e) => setStockOutCustomStart(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-40" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={stockOutCustomEnd} onChange={(e) => setStockOutCustomEnd(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-40" />
          </div>
        )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title="Pads Dispatched" subtitle="Total pads sent out" variant="gradient" accentColor={palette.rose}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-3xl font-bold text-rose-500">{stockOutPadsDispatched.toLocaleString()}</span>
              <span className="text-xs text-gray-400 mt-1">pads</span>
            </div>
          </ChartCard>

          <ChartCard title="Packs Dispatched" subtitle="Total packs dispatched" variant="gradient" accentColor={palette.orange}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-3xl font-bold text-orange-500">{stockOutPacksDispatched.toLocaleString()}</span>
              <span className="text-xs text-gray-400 mt-1">packs</span>
            </div>
          </ChartCard>

          <ChartCard title="Dispatch Transactions" subtitle="Stock-out entries logged" variant="gradient" accentColor={palette.blue}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-3xl font-bold text-blue-500">{stockOutPeriodData.length.toLocaleString()}</span>
              <span className="text-xs text-gray-400 mt-1">transactions</span>
            </div>
          </ChartCard>
        </div>
        <form onSubmit={handleStockOutSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Stock-Out Entry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={stockOutForm.date} onChange={(e) => setStockOutForm({ ...stockOutForm, date: e.target.value })}
                required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
              <select value={stockOutForm.destination} onChange={(e) => setStockOutForm({ ...stockOutForm, destination: e.target.value })}
                required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">Select...</option>
                <option value="BULK_CUSTOMER">Bulk Customer</option>
                <option value="RETAIL">Retail</option>
                <option value="AGENT">Agent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Ref</label>
              <input type="text" value={stockOutForm.customerRef} onChange={(e) => setStockOutForm({ ...stockOutForm, customerRef: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Name or ID" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <div className="flex gap-2">
                <select value={stockOutForm.batchRef} onChange={(e) => setStockOutForm({ ...stockOutForm, batchRef: e.target.value })}
                  required className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="">Select batch...</option>
                  {batches.map((b) => (<option key={b.id} value={b.id}>{b.batchNumber} — {b.packsProduced.toLocaleString()} / {b.maxPacks.toLocaleString()} packs</option>))}
                </select>
                <button type="button" onClick={() => window.open("/production/batches", "_blank")}
                  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 whitespace-nowrap">+ New</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pack Size</label>
              <select value={stockOutForm.packSize} onChange={(e) => setStockOutForm({ ...stockOutForm, packSize: e.target.value as PackSize })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="HALF_DOZEN">Half Dozen (6 Packs)</option>
                <option value="DOZEN">Dozen (12 Packs)</option>
                <option value="CARTON">Carton (120 packs)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" value={stockOutForm.quantity || ""} onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: parseInt(e.target.value) || 0 })}
                required min={1} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dispatched By</label>
              <select value={stockOutForm.dispatchedBy} onChange={(e) => setStockOutForm({ ...stockOutForm, dispatchedBy: e.target.value })}
                required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">Select...</option>
                {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="py-2 px-6 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50">
              {saving ? "Saving..." : "Record Stock-Out"}
            </button>
          </div>
        </form>
      </>)}

      <ReportCard title="Storage Report" subtitle="Download a PDF summary of stock and inventory data" onGenerate={handleGenerateReport} />
    </div>
    </RouteGuard>
  );
}
