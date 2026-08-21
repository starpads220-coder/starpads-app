"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { StockIn, StockOut, PackSize, Batch, ProductionEntry, StageId, STAGE_LABELS, STAGE_ORDER } from "@/types";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { PACK_SIZES } from "@/types";
import { useCollectionQuery } from "@/hooks/use-firestore-query";
import { ChartCard } from "@/components/ui/ChartCard";
import { RadialProgress } from "@/components/ui/RadialProgress";
import { PieWithLegendChart } from "@/components/charts/PieWithLegendChart";
import { VerticalBarChart } from "@/components/charts/VerticalBarChart";
import { CalendarHeatmap } from "@/components/charts/CalendarHeatmap";
import { palette } from "@/components/charts";
import { showToast } from "@/components/ui/Toast";
import { ReportCard } from "@/components/reports/ReportCard";
import type { PeriodSelection } from "@/components/reports/PeriodSelector";

const PADS_PER_PACK = 3;

const MATERIAL_LABELS: Record<string, string> = {
  FLEECE: "Fleece [Inner]",
  FLANNEL: "Flannel [Outer]",
  PUL: "PUL",
  COMBINED: "Combined",
};

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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"dashboard" | "stock-in" | "stock-out" | "wip" | "analytics">("dashboard");
  const [saving, setSaving] = useState(false);

  const visibleTabs = ["dashboard", "stock-in", "stock-out", "wip", "analytics"] as const;

  const [moveEntryId, setMoveEntryId] = useState<string | null>(null);
  // Dashboard batch selector — defaults to oldest active batch
  const [dashboardBatchId, setDashboardBatchId] = useState<string>("");
  const [storagePeriod, setStoragePeriod] = useState<StoragePeriod>("month");
  const [storageCustomStart, setStorageCustomStart] = useState("");
  const [storageCustomEnd, setStorageCustomEnd] = useState("");
  const [stockInPeriod, setStockInPeriod] = useState<StoragePeriod>("month");
  const [stockInCustomStart, setStockInCustomStart] = useState("");
  const [stockInCustomEnd, setStockInCustomEnd] = useState("");
  const [stockOutPeriod, setStockOutPeriod] = useState<StoragePeriod>("month");
  const [stockOutCustomStart, setStockOutCustomStart] = useState("");
  const [stockOutCustomEnd, setStockOutCustomEnd] = useState("");
  const [wipPeriod, setWipPeriod] = useState<StoragePeriod>("month");
  const [wipCustomStart, setWipCustomStart] = useState("");
  const [wipCustomEnd, setWipCustomEnd] = useState("");


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

  const { data: employees = [] } = useCollectionQuery<{ id: string; name: string; isActive?: boolean; active?: boolean }>(
    "employees", [orderBy("name")], { staleTime: 10 * 60 * 1000 }
  );

  const { data: productionEntries = [] } = useCollectionQuery<ProductionEntry>(
    "productionEntries", [], { staleTime: 0 }
  );

  // --- URL param auto-population (Move to Stock flow) ---
  // Refs are placed here so all state/query hooks above are already initialized.
  const pendingEmployeeIdRef = useRef<string | null>(null);
  const urlParamsAppliedRef = useRef(false);
  const employeeResolved = useRef(false);

  // Effect 1: Apply non-employee URL params once on mount
  useEffect(() => {
    if (urlParamsAppliedRef.current) return;
    urlParamsAppliedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const dateParam = params.get("date");
    const quantityParam = params.get("quantity");
    const batchRefParam = params.get("batchRef");
    const entryIdParam = params.get("entryId");
    const employeeIdParam = params.get("employeeId");
    const customerRefParam = params.get("customerRef");
    const destinationParam = params.get("destination");
    const packSizeParam = params.get("packSize");
    const dispatchedByParam = params.get("dispatchedBy");

    if (tabParam === "stock-in") setActiveTab("stock-in");
    if (tabParam === "stock-out") setActiveTab("stock-out");

    const isMoveToStock = !!entryIdParam;
    const packSizeMap: Record<string, number> = {
      HALF_DOZEN: 6,
      DOZEN: 12,
      CARTON: 120,
      ONE_PACK: 1,
    };
    const resolvedPackSize = (packSizeParam as PackSize) || "HALF_DOZEN";

    if (isMoveToStock || dateParam || quantityParam || batchRefParam || packSizeParam) {
      setStockInForm((prev) => ({
        ...prev,
        date: dateParam || prev.date,
        quantity: quantityParam
          ? Math.round(parseFloat(quantityParam))
          : prev.quantity,
        batchRef: batchRefParam || prev.batchRef,
        packSize: resolvedPackSize,
      }));
    }

    if (employeeIdParam) {
      pendingEmployeeIdRef.current = employeeIdParam;
    }

    if (isMoveToStock && (customerRefParam || destinationParam || packSizeParam || dispatchedByParam || dateParam)) {
      setStockOutForm((prev) => ({
        ...prev,
        date: dateParam || prev.date,
        customerRef: customerRefParam || prev.customerRef,
        destination: destinationParam || prev.destination,
        packSize: (packSizeParam as PackSize) || prev.packSize,
        quantity: quantityParam ? Math.round(parseFloat(quantityParam)) : prev.quantity,
        batchRef: batchRefParam || prev.batchRef,
        dispatchedBy: dispatchedByParam || prev.dispatchedBy,
      }));
    } else if (customerRefParam || destinationParam || packSizeParam || dispatchedByParam || dateParam) {
      setStockOutForm((prev) => ({
        ...prev,
        date: dateParam || prev.date,
        customerRef: customerRefParam || prev.customerRef,
        destination: destinationParam || prev.destination,
        packSize: (packSizeParam as PackSize) || prev.packSize,
        quantity: quantityParam ? Math.round(parseFloat(quantityParam)) : prev.quantity,
        batchRef: batchRefParam || prev.batchRef,
        dispatchedBy: dispatchedByParam || prev.dispatchedBy,
      }));
    }

    if (entryIdParam) setMoveEntryId(entryIdParam);
  }, []);

  // Effect 2: Resolve employeeId → receivedBy once employees data arrives from Firestore
  useEffect(() => {
    if (employeeResolved.current) return;
    if (!pendingEmployeeIdRef.current || employees.length === 0) return;
    employeeResolved.current = true;
    const empId = pendingEmployeeIdRef.current;
    const emp = employees.find((e) => e.id === empId);
    setStockInForm((prev) => ({ ...prev, receivedBy: emp ? emp.id : empId }));
  }, [employees]);

  // The oldest active batch (earliest startDate, fallback to lowest batchNumber) is the one that must be filled first
  const oldestActiveBatch = useMemo(() => {
    // Only consider batches that are ACTIVE and have not yet reached their max capacity
    const activeBatches = batches.filter((b) => b.status === "ACTIVE" && b.packsProduced < b.maxPacks);
    if (activeBatches.length === 0) return null;
    return activeBatches.reduce((oldest, b) => {
      if (b.startDate < oldest.startDate) return b;
      if (b.startDate > oldest.startDate) return oldest;
      return b.batchNumber < oldest.batchNumber ? b : oldest;
    });
  }, [batches]);

  const activeBatch = oldestActiveBatch;

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

  const currentStock = useMemo(() => {
    const stock: Record<PackSize, number> = { HALF_DOZEN: 0, DOZEN: 0, CARTON: 0, ONE_PACK: 0 };
    periodStockIns.forEach((si) => { stock[si.packSize as PackSize] += si.quantity; });
    periodStockOuts.forEach((so) => { stock[so.packSize as PackSize] -= so.quantity; });
    return stock;
  }, [periodStockIns, periodStockOuts]);

  // Dashboard balances reflect stock-in minus stock-out movements in the selected period.
  // Each stored pack contains three pads.
  const totalPacks = useMemo(
    () =>
      periodStockIns.reduce((sum, stockIn) => sum + stockIn.quantity, 0) -
      periodStockOuts.reduce((sum, stockOut) => sum + stockOut.quantity, 0),
    [periodStockIns, periodStockOuts]
  );

  const totalPads = useMemo(
    () => totalPacks * PADS_PER_PACK,
    [totalPacks]
  );

  const stockInBounds = useMemo(
    () => getStoragePeriodBounds(stockInPeriod, stockInCustomStart, stockInCustomEnd),
    [stockInPeriod, stockInCustomStart, stockInCustomEnd]
  );

  const stockInPeriodData = useMemo(
    () => stockIns.filter((stockIn) => stockIn.date >= stockInBounds.start && stockIn.date <= stockInBounds.end),
    [stockIns, stockInBounds]
  );

  // Stock-In tab totals reflect entries in its selected period.
  const stockInTotalPacks = useMemo(
    () => stockInPeriodData.reduce((sum, stockIn) => sum + stockIn.quantity, 0),
    [stockInPeriodData]
  );

  const stockInTotalPads = useMemo(
    () => stockInTotalPacks * PADS_PER_PACK,
    [stockInTotalPacks]
  );

  // The batch shown in the dashboard card — uses dashboard selector, falls back to oldest active
  const dashboardBatch = useMemo(() => {
    if (dashboardBatchId) return batches.find((b) => b.id === dashboardBatchId) ?? activeBatch;
    return activeBatch;
  }, [dashboardBatchId, batches, activeBatch]);

  // Combined packs: direct from the single source of truth
  const batchTotalPacks = useMemo(() => dashboardBatch?.packsProduced ?? 0, [dashboardBatch]);

  const batchCompletionPct = useMemo(() => {
    if (!dashboardBatch) return 0;
    return Math.min(100, Math.round((batchTotalPacks / dashboardBatch.maxPacks) * 100));
  }, [dashboardBatch, batchTotalPacks]);

  const stageCounts = useMemo(() => {
    const wipBounds = getStoragePeriodBounds(wipPeriod, wipCustomStart, wipCustomEnd);
    const filtered = productionEntries.filter((e) => e.date >= wipBounds.start && e.date <= wipBounds.end);
    const counts: Record<StageId, number> = {
      "STG-01": 0, "STG-02": 0, "STG-03": 0, "STG-04": 0, "STG-05": 0, "STG-06": 0, "STG-09": 0, "STG-07": 0, "STG-08": 0, "STG-10": 0,
    };
    filtered.forEach((e) => { const sid = e.stageId as StageId; counts[sid] = (counts[sid] || 0) + e.actualPieces; });
    return counts;
  }, [productionEntries, wipPeriod, wipCustomStart, wipCustomEnd]);

  const wipEntries = useMemo(() => {
    const wipBounds = getStoragePeriodBounds(wipPeriod, wipCustomStart, wipCustomEnd);
    return productionEntries
      .filter((e) => e.date >= wipBounds.start && e.date <= wipBounds.end)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [productionEntries, wipPeriod, wipCustomStart, wipCustomEnd]);

  const packsBySizeData = useMemo(() => {
    const bySize: Record<string, number> = {};
    stockIns.forEach((si) => { bySize[si.packSize] = (bySize[si.packSize] || 0) + si.quantity; });
    return Object.entries(bySize).map(([packSize, value]) => ({
      name:
        packSize === "ONE_PACK"
          ? "Single Pack"
          : packSize === "HALF_DOZEN"
            ? "Half Dozen"
            : packSize === "DOZEN"
              ? "Dozen"
              : "Carton",
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
      // ── Sequential batch enforcement ──────────────────────────────────────
      // Determine the oldest ACTIVE batch at submit time (freshest from state)
      const activeBatches = batches.filter((b) => b.status === "ACTIVE");
      const oldestActive = activeBatches.length > 0
        ? activeBatches.reduce((oldest, b) => b.startDate < oldest.startDate ? b : oldest)
        : null;

      if (oldestActive && stockInForm.batchRef !== oldestActive.id) {
        const batchNum = oldestActive.batchNumber;
        const remaining = oldestActive.maxPacks - oldestActive.packsProduced;
        showToast(
          `⚠️ Fill active batch ${batchNum} first (${remaining.toLocaleString()} packs remaining) before adding stock to a newer batch.`,
          "error"
        );
        setSaving(false);
        return;
      }

      // ── Capacity cap: prevent exceeding the remaining capacity ────────────
      if (oldestActive) {
        const thisBatchCurrentPadsQuery = query(
          collection(db, "stockIns"),
          where("batchRef", "==", stockInForm.batchRef)
        );
        const currentSnap = await getDocs(thisBatchCurrentPadsQuery);
        // Capacity check: use raw quantity sum (same unit as packsProduced)
        const currentPacks = currentSnap.docs.reduce((sum, d) => sum + ((d.data().quantity as number) || 0), 0);
        const remaining = oldestActive.maxPacks - oldestActive.packsProduced;
        const incomingPacks = stockInForm.quantity;

        if (incomingPacks > remaining) {
          showToast(
            `⚠️ Entry would exceed batch capacity. Only ${remaining.toLocaleString()} packs remaining in ${oldestActive.batchNumber}. You entered ${incomingPacks.toLocaleString()} packs.`,
            "error"
          );
          setSaving(false);
          return;
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      const batchDocRef = doc(db, "batches", stockInForm.batchRef);
      await addDoc(collection(db, "stockIns"), { ...stockInForm, createdAt: Timestamp.now() });
      if (moveEntryId) {
        await updateDoc(doc(db, "productionEntries", moveEntryId), {
          movedToStockAt: Timestamp.now(),
        });
        setMoveEntryId(null);
      }
      
      // Update packsProduced = sum of all stock-in quantity entries for this batch
      const allBatchStockInsSnap = await getDocs(
        query(collection(db, "stockIns"), where("batchRef", "==", stockInForm.batchRef))
      );
      const newPacksProduced = allBatchStockInsSnap.docs.reduce(
        (sum, d) => sum + ((d.data().quantity as number) || 0),
        0
      );
      const selectedBatch = batches.find((b) => b.id === stockInForm.batchRef);
      const maxPacks = selectedBatch?.maxPacks ?? 10000;
      const batchUpdates: Record<string, unknown> = { packsProduced: newPacksProduced };
      if (newPacksProduced >= maxPacks) {
        batchUpdates.status = "COMPLETE";
        batchUpdates.completionDate = new Date().toISOString().split("T")[0];
      }
      await updateDoc(batchDocRef, batchUpdates);

      queryClient.invalidateQueries({ queryKey: ["stockIns"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setStockInForm({ date: new Date().toISOString().split("T")[0], batchRef: "", packSize: "HALF_DOZEN", quantity: 0, receivedBy: "", notes: "" });
      showToast("Stock-In record saved successfully", "success");
    } catch (err) {
      console.error("Stock-In save failed:", err);
      showToast("Failed to save Stock-In record: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStockOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const batchRef = stockOutForm.batchRef || oldestActiveBatch?.id || "";
      if (!oldestActiveBatch || batchRef !== oldestActiveBatch.id) {
        showToast(
          oldestActiveBatch
            ? `⚠️ Record stock-out against current batch ${oldestActiveBatch.batchNumber} before using another batch.`
            : "⚠️ No active batch with remaining capacity is available.",
          "error"
        );
        return;
      }
      await addDoc(collection(db, "stockOuts"), { ...stockOutForm, batchRef, createdAt: Timestamp.now() });
      queryClient.invalidateQueries({ queryKey: ["stockOuts"] });
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
              onClick={() => setActiveTab(tab)}
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
          <ChartCard title="Total Packs" subtitle="Stock balance in period" variant="gradient" accentColor={palette.orange}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-3xl font-bold text-orange-500">{totalPacks.toLocaleString()}</span>
              <span className="text-xs text-gray-400 mt-1">packs in period</span>
            </div>
          </ChartCard>

          <ChartCard title="Total Pads" subtitle="Total packs × 3" variant="gradient" accentColor={palette.emerald}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-3xl font-bold text-emerald-500">{totalPads.toLocaleString()}</span>
              <span className="text-xs text-gray-400 mt-1">pads in period</span>
            </div>
          </ChartCard>

          <ChartCard
            title="Batch Progress"
            subtitle={
              dashboardBatch
                ? `${dashboardBatch.batchNumber} — ${batchTotalPacks.toLocaleString()} / ${dashboardBatch.maxPacks.toLocaleString()} packs`
                : "No Active Batch"
            }
            variant="gradient"
          >
            <div className="flex-1 flex flex-col items-center justify-center gap-2 pt-1">
              <RadialProgress
                value={batchCompletionPct}
                label={`${batchCompletionPct}%`}
                subLabel="Complete"
                color={batchCompletionPct === 100 ? "#22c55e" : "#3b82f6"}
              />
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                  Finished Packs: {batchTotalPacks.toLocaleString()}
                </span>
              </div>
              {/* Batch selector */}
              <div className="flex items-center gap-2 mt-1 w-full px-1">
                <select
                  value={dashboardBatchId || dashboardBatch?.id || ""}
                  onChange={(e) => setDashboardBatchId(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-white text-gray-700"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} ({b.status})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => window.open("/production/batches", "_blank")}
                  className="px-2 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 whitespace-nowrap"
                >
                  + New
                </button>
              </div>
            </div>
          </ChartCard>

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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Work-In-Progress (WIP) Summary</h2>
              <p className="text-sm text-gray-500">
                {wipPeriod === "today" ? "Today" : wipPeriod === "week" ? "Last 7 days" : wipPeriod === "month" ? "Last 30 days" : wipPeriod === "12months" ? "Last 12 months" : "Custom period"}
              </p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(["today", "week", "month", "12months", "custom"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setWipPeriod(p)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                    wipPeriod === p ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                  }`}
                >
                  {p === "today" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : p === "12months" ? "12 Months" : "Custom"}
                </button>
              ))}
            </div>
          </div>
          {wipPeriod === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={wipCustomStart} onChange={(e) => setWipCustomStart(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-40" />
              <span className="text-xs text-gray-400">to</span>
              <input type="date" value={wipCustomEnd} onChange={(e) => setWipCustomEnd(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-40" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAGE_ORDER.map((stageId) => {
              const isPackStage = stageId === "STG-08" || stageId === "STG-10";
              const unit = isPackStage ? "packs produced" : "pieces produced";
              const color = isPackStage ? palette.emerald : palette.blue;

              return (
                <ChartCard key={stageId} title={STAGE_LABELS[stageId]} subtitle={stageId} variant="gradient" accentColor={color}>
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="text-2xl font-bold" style={{ color }}>{stageCounts[stageId].toLocaleString()}</span>
                    <span className="text-xs text-gray-400 mt-1">{unit}</span>
                  </div>
                </ChartCard>
              );
            })}
          </div>

          {/* WIP Entries */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Production Entries</h2>
            {wipEntries.length === 0 ? (
              <div className="text-center text-gray-400 py-4">No production entries in this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pieces</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {wipEntries.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="px-4 py-3 text-sm text-gray-700">{e.date}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{e.stageId}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {employees.find((emp) => emp.id === e.employeeId)?.name ?? e.employeeId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{e.materialType ? MATERIAL_LABELS[e.materialType] || e.materialType : "—"}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.actualPieces.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
        <>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Stock-In Summary</h2>
              <p className="text-sm text-gray-500">
                {stockInPeriod === "today" ? "Today" : stockInPeriod === "week" ? "Last 7 days" : stockInPeriod === "month" ? "Last 30 days" : stockInPeriod === "12months" ? "Last 12 months" : "Custom period"}
              </p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(["today", "week", "month", "12months", "custom"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setStockInPeriod(period)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                    stockInPeriod === period ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                  }`}
                >
                  {period === "today" ? "Today" : period === "week" ? "This Week" : period === "month" ? "This Month" : period === "12months" ? "12 Months" : "Custom"}
                </button>
              ))}
            </div>
          </div>
          {stockInPeriod === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={stockInCustomStart} onChange={(e) => setStockInCustomStart(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-40" />
              <span className="text-xs text-gray-400">to</span>
              <input type="date" value={stockInCustomEnd} onChange={(e) => setStockInCustomEnd(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-40" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard title="Total Packs" subtitle="Stock-in entries in period" variant="gradient" accentColor={palette.orange}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-3xl font-bold text-orange-500">{stockInTotalPacks.toLocaleString()}</span>
              <span className="text-xs text-gray-400 mt-1">packs in stock</span>
            </div>
          </ChartCard>

          <ChartCard title="Total Pads" subtitle="Total packs × 3" variant="gradient" accentColor={palette.emerald}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-3xl font-bold text-emerald-500">{stockInTotalPads.toLocaleString()}</span>
              <span className="text-xs text-gray-400 mt-1">pads in stock</span>
            </div>
          </ChartCard>

          <ChartCard
            title="Batch Progress"
            subtitle={
              dashboardBatch
                ? `${dashboardBatch.batchNumber} — ${batchTotalPacks.toLocaleString()} / ${dashboardBatch.maxPacks.toLocaleString()} packs`
                : "No Active Batch"
            }
            variant="gradient"
          >
            <div className="flex flex-col items-center justify-center h-full">
              <RadialProgress
                value={batchCompletionPct}
                label={`${batchCompletionPct}%`}
                subLabel="Complete"
                color={batchCompletionPct === 100 ? "#22c55e" : "#3b82f6"}
              />
            </div>
          </ChartCard>
        </div>

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
              {oldestActiveBatch && (
                <p className="text-xs text-amber-600 mb-1">
                  ⚠️ Suggested batch: <strong>{oldestActiveBatch.batchNumber}</strong> —{" "}
                  {(oldestActiveBatch.maxPacks - oldestActiveBatch.packsProduced).toLocaleString()} packs remaining.
                </p>
              )}
              <div className="flex gap-2">
                <select value={stockInForm.batchRef} onChange={(e) => setStockInForm({ ...stockInForm, batchRef: e.target.value })}
                  required className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option value="">Select batch...</option>
                  {(moveEntryId ? batches : batches.filter((b) => b.status === "ACTIVE")).map((b) => {
                    const isOldest = b.id === oldestActiveBatch?.id;
                    return (
                      <option key={b.id} value={b.id}>
                        {isOldest ? "✅ " : "🔒 "}{b.batchNumber} — {(b.maxPacks - b.packsProduced).toLocaleString()} remaining
                      </option>
                    );
                  })}
                </select>
                <button type="button" onClick={() => window.open("/production/batches", "_blank")}
                  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 whitespace-nowrap">+ New</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pack Size</label>
              <select value={stockInForm.packSize} onChange={(e) => setStockInForm({ ...stockInForm, packSize: e.target.value as PackSize })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="ONE_PACK">Single Pack (1 Pad)</option>
                <option value="HALF_DOZEN">Half Dozen (6 Pads)</option>
                <option value="DOZEN">Dozen (12 Pads)</option>
                <option value="CARTON">Carton (120 Pads)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Packs</label>
              <input type="number" value={stockInForm.quantity || ""} onChange={(e) => setStockInForm({ ...stockInForm, quantity: parseInt(e.target.value) || 0 })}
                required min={1} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received By</label>
              <select value={stockInForm.receivedBy} onChange={(e) => setStockInForm({ ...stockInForm, receivedBy: e.target.value })}
                required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">Select...</option>
                {employees.filter((e) => e.isActive !== false && e.active !== false).map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
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

        {/* Stock-In Entries */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Stock-In Entries</h2>
          {stockIns.length === 0 ? (
            <div className="text-center text-gray-400 py-4">No stock-in entries recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pack Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Packs</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stockIns.map((si, i) => (
                    <tr key={si.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-4 py-3 text-sm text-gray-700">{si.date}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{si.batchRef}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {si.packSize === "HALF_DOZEN" ? "Half Dozen" : si.packSize === "DOZEN" ? "Dozen" : "Carton"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{si.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {employees.find((e) => e.id === si.receivedBy)?.name ?? si.receivedBy}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{si.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
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
                <select value={stockOutForm.batchRef || oldestActiveBatch?.id || ""} onChange={(e) => setStockOutForm({ ...stockOutForm, batchRef: e.target.value })}
                  required className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm">
                  {oldestActiveBatch ? (
                    <option value={oldestActiveBatch.id}>
                      {oldestActiveBatch.batchNumber} — {(oldestActiveBatch.maxPacks - oldestActiveBatch.packsProduced).toLocaleString()} packs remaining
                    </option>
                  ) : (
                    <option value="">No active batch with remaining capacity</option>
                  )}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Packs</label>
              <input type="number" value={stockOutForm.quantity || ""} onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: parseInt(e.target.value) || 0 })}
                required min={1} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dispatched By</label>
              <select value={stockOutForm.dispatchedBy} onChange={(e) => setStockOutForm({ ...stockOutForm, dispatchedBy: e.target.value })}
                required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">Select...</option>
                {employees.filter((e) => e.isActive !== false && e.active !== false).map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
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

        {/* Stock-Out Entries */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Stock-Out Entries</h2>
          {stockOuts.length === 0 ? (
            <div className="text-center text-gray-400 py-4">No stock-out entries recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Ref</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pack Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Packs</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispatched By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stockOuts.map((so, i) => (
                    <tr key={so.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-4 py-3 text-sm text-gray-700">{so.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {so.destination === "BULK_CUSTOMER" ? "Bulk Customer" : so.destination === "RETAIL" ? "Retail" : so.destination === "AGENT" ? "Agent" : so.destination}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{so.customerRef || "—"}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{so.batchRef}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {so.packSize === "HALF_DOZEN" ? "Half Dozen" : so.packSize === "DOZEN" ? "Dozen" : "Carton"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{so.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {employees.find((e) => e.id === so.dispatchedBy)?.name ?? so.dispatchedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>)}

      <ReportCard title="Storage Report" subtitle="Download a PDF summary of stock and inventory data" onGenerate={handleGenerateReport} />
    </div>
    </RouteGuard>
  );
}
