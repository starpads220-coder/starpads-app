"use client";

import { useState, useEffect, useMemo, useCallback, FormEvent } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  ProductionEntry,
  StageId,
  MaterialType,
  Employee,
  ProductionStage,
  TargetConfig,
  Batch,
  STAGE_LABELS,
  STAGE_ORDER,
} from "@/types";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ChartCard } from "@/components/ui/ChartCard";
import { useCollectionQuery } from "@/hooks/use-firestore-query";
import { SingleDonutChart } from "@/components/charts/SingleDonutChart";
import { SingleBarChart } from "@/components/charts/SingleBarChart";
import { TransactionValueChart } from "@/components/charts/TransactionValueChart";
import { RadarChart } from "@/components/charts/RadarChart";
import { ScreenReadersBarChart } from "@/components/charts/ScreenReadersBarChart";
import { StandardBarChart } from "@/components/charts/StandardBarChart";
import { palette, chartColors } from "@/components/charts";
import { ReportCard } from "@/components/reports/ReportCard";
import type { PeriodSelection } from "@/components/reports/PeriodSelector";

type TimeWindow = "today" | "week" | "month" | "12months" | "custom";

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
    const yearStart = new Date(now);
    yearStart.setFullYear(now.getFullYear() - 1);
    return { start: yearStart.toISOString().split("T")[0], end: todayStr };
  }
  return { start: customStart || todayStr, end: customEnd || todayStr };
}

const CUTTING_RATIOS: Record<string, number> = {
  FLANNEL: 5,
  FLEECE: 4,
  PUL: 4,
  COMBINED: 4,
};

const stageUnit: Record<StageId, string> = {
  "STG-01": "pieces",
  "STG-02": "pieces",
  "STG-03": "pieces",
  "STG-04": "pieces",
  "STG-05": "pieces",
  "STG-06": "sets",
  "STG-07": "packs",
};

const stagesWithMaterial: StageId[] = ["STG-01", "STG-02", "STG-03"];

export default function ProductionPage() {
  const { userRole } = useAuth();
  const [saving, setSaving] = useState(false);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [viewDate, setViewDate] = useState(new Date().toISOString().split("T")[0]);

  const [form, setForm] = useState({
    employeeId: "",
    date: new Date().toISOString().split("T")[0],
    stageId: "STG-01" as StageId,
    materialType: "" as MaterialType | "",
    metersInput: 0,
    actualPieces: 0,
    batchRef: "",
    notes: "",
  });

  const { data: employees = [] } = useCollectionQuery<Employee>("employees", [
    where("isActive", "==", true),
    orderBy("name"),
  ], { staleTime: 10 * 60 * 1000 });

  const { data: stages = [] } = useCollectionQuery<ProductionStage>("productionStages", [], {
    staleTime: 10 * 60 * 1000,
  });

  const { data: targetConfigs = [] } = useCollectionQuery<TargetConfig>("targetConfigs", [], {
    staleTime: 10 * 60 * 1000,
  });

  const { data: batches = [] } = useCollectionQuery<Batch>("batches", [
    where("status", "==", "ACTIVE"),
  ], { staleTime: 2 * 60 * 1000 });

  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      query(
        collection(db, "productionEntries"),
        orderBy("date", "desc"),
        limit(500)
      ),
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionEntry)));
        setEntriesLoading(false);
      },
      (err) => {
        console.error("productionEntries listener error:", err);
        setEntriesLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const { start, end } = getDateBounds(timeWindow, customStart, customEnd);
  const filteredEntries = useMemo(() =>
    entries.filter((e) => e.date >= start && e.date <= end),
    [entries, start, end]
  );

  const selectedStage = stages.find((s) => s.stageId === form.stageId);

  const activeOverride = useMemo(() => {
    if (!form.employeeId || !form.stageId) return null;
    return targetConfigs
      .filter(
        (tc) =>
          tc.employeeId === form.employeeId &&
          tc.stageId === form.stageId &&
          tc.effectiveDate <= form.date
      )
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0] ?? null;
  }, [targetConfigs, form.employeeId, form.stageId, form.date]);

  const dailyTarget = form.stageId === "STG-07"
    ? 120
    : activeOverride
      ? activeOverride.dailyTarget
      : selectedStage
        ? selectedStage.defaultTarget
        : 0;

  const dailyWageRate = selectedStage ? selectedStage.defaultWageRate : 0;

  const performance = useMemo(
    () => (dailyTarget > 0 && form.actualPieces > 0
      ? Math.round((form.actualPieces / dailyTarget) * 100)
      : 0),
    [dailyTarget, form.actualPieces]
  );

  const estimatedEarnings = useMemo(
    () => (dailyTarget > 0 && form.actualPieces > 0
      ? Math.round((form.actualPieces / dailyTarget) * dailyWageRate)
      : 0),
    [dailyTarget, form.actualPieces, dailyWageRate]
  );

  const expectedPieces =
    form.stageId === "STG-01" && form.materialType && form.metersInput > 0
      ? form.metersInput * (CUTTING_RATIOS[form.materialType] || 0)
      : 0;

  const wastePct =
    expectedPieces > 0 && form.actualPieces > 0
      ? Math.max(0, Math.round(((expectedPieces - form.actualPieces) / expectedPieces) * 100))
      : 0;

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.name : id;
  };

  const getBatchNumber = (batchRef: string) => {
    const batch = batches.find((b) => b.id === batchRef);
    return batch ? batch.batchNumber : batchRef;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) return;
    if (form.stageId === "STG-07" && !form.batchRef) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "productionEntries"), {
        employeeId: form.employeeId,
        date: form.date,
        stageId: form.stageId,
        materialType: stagesWithMaterial.includes(form.stageId) ? form.materialType : null,
        metersInput: form.stageId === "STG-01" ? form.metersInput : null,
        wastePct: form.stageId === "STG-01" ? wastePct : null,
        targetPieces: dailyTarget,
        actualPieces: form.actualPieces,
        batchRef: form.stageId === "STG-07" ? form.batchRef : "",
        performancePct: performance,
        earningsUgx: estimatedEarnings,
        notes: form.notes,
        createdAt: Timestamp.now(),
        createdBy: userRole?.uid ?? "",
      });
      setForm((prev) => ({
        ...prev,
        metersInput: 0,
        actualPieces: 0,
        notes: "",
      }));
    } finally {
      setSaving(false);
    }
  };

  const stageCounts = useMemo(() => {
    return STAGE_ORDER.reduce(
      (acc, stage) => {
        acc[stage] = filteredEntries
          .filter((e) => e.stageId === stage)
          .reduce((sum, e) => sum + e.actualPieces, 0);
        return acc;
      },
      {} as Record<StageId, number>
    );
  }, [filteredEntries]);

  const estimatedComplete = useMemo(
    () => Math.min(...STAGE_ORDER.map((s) => stageCounts[s])),
    [stageCounts]
  );

  const activeWorkers = useMemo(
    () => new Set(filteredEntries.map((e) => e.employeeId)).size,
    [filteredEntries]
  );

  const stageBarData = useMemo(() => {
    const labels: Record<string, string> = {
      "STG-01": "Cut", "STG-02": "Sew M", "STG-03": "Sew I", "STG-04": "Overlock",
      "STG-05": "Pouch", "STG-06": "Pin", "STG-07": "Pack",
    };
    return STAGE_ORDER.map((s) => ({ label: labels[s] || s, value: stageCounts[s] }));
  }, [stageCounts]);

  const productionTrend = useMemo(() => {
    const trend: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayTotal = filteredEntries.filter((e) => e.date === key).reduce((s, e) => s + e.actualPieces, 0);
      trend.push({ label: key.slice(5), value: dayTotal });
    }
    return trend;
  }, [filteredEntries]);

  const maxStageValue = useMemo(
    () => Math.max(...STAGE_ORDER.map((s) => stageCounts[s]), 1),
    [stageCounts]
  );

  const totalPieces = useMemo(
    () => filteredEntries.reduce((s, e) => s + e.actualPieces, 0),
    [filteredEntries]
  );

  const totalPackagedPads = useMemo(
    () => stageCounts["STG-07"],
    [stageCounts]
  );

  const totalMetersInput = useMemo(
    () => filteredEntries
      .filter((e) => e.stageId === "STG-01" && e.metersInput != null)
      .reduce((s, e) => s + (e.metersInput || 0), 0),
    [filteredEntries]
  );

  const totalEarnings = useMemo(
    () => filteredEntries.reduce((s, e) => s + e.earningsUgx, 0),
    [filteredEntries]
  );

  const avgPerformance = useMemo(() => {
    const withPerf = filteredEntries.filter((e) => e.performancePct > 0);
    return withPerf.length > 0
      ? Math.round(withPerf.reduce((s, e) => s + e.performancePct, 0) / withPerf.length)
      : 0;
  }, [filteredEntries]);

  const workerMetrics = useMemo(() => {
    const byWorker: Record<string, { pieces: number; earnings: number; perfSum: number; count: number }> = {};
    filteredEntries.forEach((e) => {
      if (!byWorker[e.employeeId]) byWorker[e.employeeId] = { pieces: 0, earnings: 0, perfSum: 0, count: 0 };
      byWorker[e.employeeId].pieces += e.actualPieces;
      byWorker[e.employeeId].earnings += e.earningsUgx;
      byWorker[e.employeeId].perfSum += e.performancePct;
      byWorker[e.employeeId].count += 1;
    });
    return Object.entries(byWorker)
      .sort((a, b) => b[1].pieces - a[1].pieces)
      .slice(0, 5)
      .map(([id, m]) => ({
        id,
        name: employees.find((e) => e.id === id)?.name ?? id,
        pieces: m.pieces,
        earnings: m.earnings,
        avgPerformance: Math.round(m.perfSum / m.count),
      }));
  }, [filteredEntries, employees]);

  const workerRadarData = useMemo(() => {
    if (workerMetrics.length === 0) return [];
    const maxPieces = Math.max(...workerMetrics.map((w) => w.pieces));
    const maxEarnings = Math.max(...workerMetrics.map((w) => w.earnings));
    const data: { subject: string; [key: string]: string | number }[] = [
      { subject: "Output" },
      { subject: "Performance" },
      { subject: "Earnings" },
    ];
    workerMetrics.forEach((w, i) => {
      const key = `w${i}`;
      data[0][key] = maxPieces > 0 ? Math.round((w.pieces / maxPieces) * 100) : 0;
      data[1][key] = w.avgPerformance;
      data[2][key] = maxEarnings > 0 ? Math.round((w.earnings / maxEarnings) * 100) : 0;
    });
    return data;
  }, [workerMetrics]);

  const workerRadarSeries = useMemo(() => {
    return workerMetrics.map((w, i) => ({
      dataKey: `w${i}`,
      name: w.name.split(" ")[0],
      color: chartColors[i % chartColors.length],
    }));
  }, [workerMetrics]);

  const materialData = useMemo(() => {
    const mat: Record<string, number> = {};
    filteredEntries
      .filter((e) => e.materialType)
      .forEach((e) => {
        const key = e.materialType!;
        mat[key] = (mat[key] || 0) + e.actualPieces;
      });
    return Object.entries(mat)
      .map(([label, value]) => ({
        label: label.charAt(0) + label.slice(1).toLowerCase(),
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredEntries]);

  const stageTargetData = useMemo(() => {
    return STAGE_ORDER.map((s) => {
      const stage = stages.find((st) => st.stageId === s);
      const shortLabel = STAGE_LABELS[s].split(" - ")[0];
      return {
        label: shortLabel,
        Actual: stageCounts[s],
        Target: stage?.defaultTarget ?? 0,
      };
    });
  }, [stageCounts, stages]);

  const wasteData = useMemo(() => {
    const waste: Record<string, { waste: number; count: number }> = {};
    filteredEntries
      .filter((e) => e.stageId === "STG-01" && e.materialType && e.wastePct != null)
      .forEach((e) => {
        const key = e.materialType!;
        if (!waste[key]) waste[key] = { waste: 0, count: 0 };
        waste[key].waste += e.wastePct!;
        waste[key].count += 1;
      });
    return Object.entries(waste)
      .map(([label, w]) => ({
        label: label.charAt(0) + label.slice(1).toLowerCase(),
        value: Math.round(w.waste / w.count),
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredEntries]);

  const pendingPackaging = useMemo(
    () => entries.filter((e) => e.stageId === "STG-07" && e.date === viewDate && !e.movedToStockAt),
    [entries, viewDate]
  );

  const handleWindowChange = (tw: TimeWindow) => {
    setTimeWindow(tw);
    if (tw !== "custom") {
      setCustomStart("");
      setCustomEnd("");
    }
  };

  const handleGenerateReport = useCallback(async (selection: PeriodSelection) => {
    const params = new URLSearchParams({
      screen: "production",
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
    a.download = `production-report-${selection.startDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <RouteGuard>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Production</h1>
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
      </div>
      {timeWindow === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-40" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-40" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Total Pieces" subtitle="All stages combined" variant="gradient" accentColor="#3b82f6">
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-blue-500">{totalPieces.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mt-1">pieces produced this period</span>
          </div>
        </ChartCard>

        <ChartCard title="Finished Pads" subtitle="Packaging stage (STG-07)" variant="gradient" accentColor="#22c55e">
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-emerald-500">{totalPackagedPads.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mt-1">completed pads packaged</span>
          </div>
        </ChartCard>

        <ChartCard title="Material Input" subtitle="Cutting stage (STG-01)" variant="gradient" accentColor="#f59e0b">
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-amber-500">{totalMetersInput.toFixed(1)}</span>
            <span className="text-xs text-gray-400 mt-1">meters of fabric cut</span>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SingleDonutChart
          value={estimatedComplete > 0 && estimatedComplete < Infinity ? estimatedComplete : 0}
          total={maxStageValue}
          title="Bottleneck Completion"
          subtitle="Est. complete pads vs max stage"
          color={palette.emerald}
          centerLabel={(estimatedComplete > 0 && estimatedComplete < Infinity ? estimatedComplete : 0).toLocaleString()}
          centerSubLabel={`of ${maxStageValue.toLocaleString()} pads`}
          height={280}
        />

        <SingleBarChart
          data={stageBarData}
          title="Stage Distribution"
          subtitle="Pieces per stage today"
          color={palette.violet}
          height={280}
        />

        <TransactionValueChart
          data={productionTrend}
          title="Production Trend"
          subtitle="Daily total pieces (7 days)"
          color={palette.blue}
          height={280}
        />

        {workerMetrics.length >= 2 ? (
          <RadarChart
            data={workerRadarData}
            series={workerRadarSeries}
            title="Worker Performance"
            subtitle="Top workers normalized"
            height={280}
            maxValue={100}
          />
        ) : (
          <ChartCard title="Worker Performance" subtitle="Top workers normalized" variant="gradient">
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              {entries.length === 0 ? "No entries today" : "Need 2+ workers"}
            </div>
          </ChartCard>
        )}

        {materialData.length > 0 ? (
          <ScreenReadersBarChart
            data={materialData}
            title="Material Usage"
            subtitle="Pieces by material type"
            color={palette.orange}
            height={280}
            labelWidth={80}
          />
        ) : (
          <ChartCard title="Material Usage" subtitle="Pieces by material type" variant="gradient">
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No material data today
            </div>
          </ChartCard>
        )}

        <StandardBarChart
          data={stageTargetData}
          series={[
            { dataKey: "Actual", name: "Actual", color: palette.emerald },
            { dataKey: "Target", name: "Target", color: palette.slateLight },
          ]}
          title="Target vs Actual"
          subtitle="Per-stage production comparison"
          height={280}
          showLegend={true}
        />

        <ChartCard title="Batch Progress" subtitle="Active batch completion" variant="gradient">
          {batches.filter(b => b.status === "ACTIVE").length > 0 ? (
            <div className="space-y-3">
              {batches.filter(b => b.status === "ACTIVE").slice(0, 5).map((b) => {
                const pct = b.maxPacks > 0 ? Math.round((b.packsProduced / b.maxPacks) * 100) : 0;
                return (
                  <div key={b.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700">{b.batchNumber}</span>
                      <span className="text-gray-500">{b.packsProduced}/{b.maxPacks}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? palette.emerald : pct >= 50 ? palette.blue : palette.orange }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No active batches</div>
          )}
        </ChartCard>

        <ChartCard title="Production Overview" subtitle="Today's key metrics" variant="gradient">
          <div className="grid grid-cols-2 gap-3 h-full">
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-white rounded-xl p-3">
              <span className="text-2xl font-bold text-emerald-600">{totalPieces.toLocaleString()}</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Total Pieces</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white rounded-xl p-3">
              <span className="text-2xl font-bold text-blue-600">{activeWorkers}</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Active Workers</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-white rounded-xl p-3">
              <span className="text-2xl font-bold text-violet-600">{avgPerformance}%</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Avg Perf.</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-white rounded-xl p-3">
              <span className="text-2xl font-bold text-amber-600">UGX {totalEarnings.toLocaleString()}</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Total Earnings</span>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Waste Analysis" subtitle="Avg waste % by material (cutting)" variant="gradient">
          {wasteData.length > 0 ? (
            <div className="space-y-3">
              {wasteData.map((w) => {
                const wColor = w.value > 10 ? palette.red : w.value > 5 ? palette.orange : palette.emerald;
                return (
                  <div key={w.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700">{w.label}</span>
                      <span className={w.value > 10 ? "text-red-500 font-semibold" : "text-gray-500"}>{w.value}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(w.value, 100)}%`, backgroundColor: wColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No cutting data today</div>
          )}
        </ChartCard>
      </div>

      <ReportCard title="Production Report" subtitle="Download a PDF summary of production data" onGenerate={handleGenerateReport} />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-gray-900">Daily Production Entry</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Worker</label>
            <select
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Select worker...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <select
              value={form.stageId}
              onChange={(e) => setForm({ ...form, stageId: e.target.value as StageId })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {(Object.entries(STAGE_LABELS) as [StageId, string][]).map(([id, label]) => (
                <option key={id} value={id}>
                  {id} — {label}
                </option>
              ))}
            </select>
          </div>
          {stagesWithMaterial.includes(form.stageId) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
              <select
                value={form.materialType}
                onChange={(e) =>
                  setForm({ ...form, materialType: e.target.value as MaterialType })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select material...</option>
                <option value="FLANNEL">Flannel</option>
                <option value="FLEECE">Fleece</option>
                <option value="PUL">PUL</option>
                <option value="COMBINED">Combined</option>
              </select>
            </div>
          )}
          {form.stageId === "STG-01" && form.materialType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meters Input</label>
              <input
                type="number"
                value={form.metersInput || ""}
                onChange={(e) =>
                  setForm({ ...form, metersInput: parseFloat(e.target.value) || 0 })
                }
                required
                min={0}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Target (read-only)</label>
            <input
              type="number"
              value={dailyTarget}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.stageId === "STG-07" ? "Packs Produced" : "Pieces Produced"} ({stageUnit[form.stageId]})
            </label>
            <input
              type="number"
              value={form.actualPieces || ""}
              onChange={(e) =>
                setForm({ ...form, actualPieces: parseInt(e.target.value) || 0 })
              }
              required
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          {form.stageId === "STG-07" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <div className="flex gap-2">
                <select
                  value={form.batchRef}
                  onChange={(e) => setForm({ ...form, batchRef: e.target.value })}
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Select batch...</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} — {b.packsProduced.toLocaleString()} / {b.maxPacks.toLocaleString()} packs
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => window.open("/production/batches", "_blank")}
                  className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 whitespace-nowrap"
                >
                  + New
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Optional"
            />
          </div>
        </div>

        {form.actualPieces > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 flex flex-wrap items-center gap-6">
            <span className="text-sm">
              Performance: <StatusBadge value={performance} />
            </span>
            <span className="text-sm text-gray-700">
              Est. Earnings: <strong className="text-ugx">UGX {estimatedEarnings.toLocaleString()}</strong>
            </span>
            {form.stageId === "STG-01" && expectedPieces > 0 && (
              <span className="text-sm text-gray-700">
                Waste: <strong className={wastePct > 10 ? "text-red-500" : "text-green-500"}>{wastePct}%</strong>
                <span className="text-gray-400 text-xs ml-1">(Expected: {Math.round(expectedPieces)})</span>
              </span>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !form.employeeId || !form.actualPieces || (form.stageId === "STG-07" && !form.batchRef)}
            className="py-2 px-6 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Log Entry"}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Entries for <span className="text-gray-900">{viewDate}</span>
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">View date:</label>
            <input
              type="date"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm w-40"
            />
          </div>
        </div>
        {entriesLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (() => {
          const viewFiltered = entries.filter((e) => e.date === viewDate);
          return viewFiltered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No entries found for {viewDate}. Select a different date or log new entries above.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pieces</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perf.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {viewFiltered.map((entry, i) => (
                  <tr key={entry.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 text-sm text-gray-700">{getEmployeeName(entry.employeeId)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {STAGE_LABELS[entry.stageId as StageId] ?? entry.stageId}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {entry.actualPieces}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.targetPieces}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={entry.performancePct} />
                    </td>
                    <td className="px-4 py-3 text-sm text-ugx font-medium">
                      UGX {entry.earningsUgx.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{getBatchNumber(entry.batchRef)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>

      {/* Move to Stock Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Move Packaged Goods to Stock</h2>
            <p className="text-sm text-gray-500 mt-1">Today's packaging (STG-07) entries ready to move into storage inventory.</p>
          </div>
        </div>
        {entriesLoading ? (
          <div className="text-center text-gray-400 py-4">Loading...</div>
        ) : pendingPackaging.length === 0 ? (
          <div className="text-center text-gray-400 py-4">No packaging entries to move to stock. All packaged goods have been transferred.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pieces</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingPackaging.map((entry, i) => (
                  <tr key={entry.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 text-sm text-gray-700">{getEmployeeName(entry.employeeId)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.actualPieces.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{getBatchNumber(entry.batchRef)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.date}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          const params = new URLSearchParams({
                            tab: "stock-in",
                            date: entry.date,
                            quantity: String(entry.actualPieces),
                            batchRef: entry.batchRef,
                            entryId: entry.id,
                          });
                          window.location.href = `/storage?${params.toString()}`;
                        }}
                        className="py-1.5 px-3 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors"
                      >
                        Move to Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </RouteGuard>
  );
}
