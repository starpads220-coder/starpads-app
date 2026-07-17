"use client";

import { useState, useMemo, useCallback } from "react";
import { orderBy, limit } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  ProductionEntry,
  SaleTransaction,
  Expense,
  StockIn,
  StockOut,
  Employee,
  Batch,
  PACK_SIZES,
  PackSize,
} from "@/types";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { useCollectionQuery } from "@/hooks/use-firestore-query";
import { ComboBarLineChart } from "@/components/charts/ComboBarLineChart";
import { GradientHorizontalBarChart } from "@/components/charts/GradientHorizontalBarChart";
import { RadialBarChart } from "@/components/charts/RadialBarChart";
import { StackedAreaChart } from "@/components/charts/StackedAreaChart";
import { PieWithLegendChart } from "@/components/charts/PieWithLegendChart";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import {
  palette,
  chartColors,
  formatCurrency,
  formatCompact,
  animationConfig,
} from "@/components/charts";
import { ReportCard } from "@/components/reports/ReportCard";
import type { PeriodSelection } from "@/components/reports/PeriodSelector";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const expenseColorMap: Record<string, string> = {
  RAW_MATERIALS: palette.violet,
  LABOUR: palette.sky,
  UTILITIES: palette.yellow,
  TRANSPORT: palette.emerald,
  PACKAGING_SUPPLIES: palette.orange,
  EQUIPMENT_MAINTENANCE: palette.blue,
  MARKETING: palette.pink,
  MISCELLANEOUS: palette.grey,
};

const colorWheel = [
  palette.violet,
  palette.sky,
  palette.emerald,
  palette.rose,
  palette.yellow,
  palette.teal,
  palette.indigo,
  palette.orange,
  palette.pink,
];

function filterDate(
  dateStr: string,
  field: string,
  timeWindow: "today" | "week" | "month" | "custom",
  todayStr: string,
  weekStart: string,
  monthStartStr: string,
  customStart?: string,
  customEnd?: string,
) {
  if (timeWindow === "today") return field === todayStr;
  if (timeWindow === "week") return field >= weekStart;
  if (timeWindow === "month") return field >= monthStartStr;
  if (timeWindow === "custom") return field >= (customStart || todayStr) && field <= (customEnd || todayStr);
  return true;
}

function DailyProductionMini({
  data,
}: {
  data: { label: string; value: number; isToday: boolean }[];
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex-1" style={{ minHeight: 0 }}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }} barSize={28}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 800, fill: "#94a3b8" }}
            dy={4}
          />
          <YAxis hide />
          <Tooltip
            cursor={false}
            content={<ChartTooltip formatter={formatCompact} />}
          />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} animationDuration={animationConfig.bar.duration}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isToday ? palette.violet : "#f1f5f9"}
                style={entry.isToday ? { filter: "drop-shadow(0 2px 6px rgba(124,58,237,0.3))" } : undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WorkerDetailBars({
  data,
  formatter = (v: number) => `${v}%`,
}: {
  data: { label: string; value: number; color: string }[];
  formatter?: (v: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-slate-400 font-semibold">
        No worker data this period
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex-1 space-y-2.5 pt-1">
      {data.map((worker, i) => {
        const width = (worker.value / maxVal) * 100;
        return (
          <div key={worker.label} className="flex items-center gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
              {i + 1}
            </span>
            <span className="w-16 truncate text-[11px] font-semibold text-slate-600 shrink-0">
              {worker.label}
            </span>
            <div className="flex-1 h-4 overflow-hidden rounded-full bg-slate-50">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(width, 4)}%`,
                  background: `linear-gradient(90deg, ${worker.color}, ${worker.color}dd)`,
                  boxShadow: `0 2px 8px ${worker.color}44`,
                }}
              />
            </div>
            <span className="w-10 text-right text-[11px] font-bold text-slate-900 shrink-0">
              {formatter(worker.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsKPIOverview({
  pieces,
  workers,
  achievement,
  batchPct,
}: {
  pieces: number;
  workers: number;
  achievement: number;
  batchPct: number;
}) {
  const metrics = [
    { label: "Pieces", value: formatCompact(pieces), pct: 100, color: palette.violet },
    { label: "Workers", value: String(workers), pct: Math.min((workers / 20) * 100, 100), color: palette.sky },
    { label: "Achievement", value: `${achievement}%`, pct: achievement, color: palette.emerald },
    { label: "Batch", value: `${batchPct}%`, pct: batchPct, color: palette.orange },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 flex-1">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
        >
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
          <p className="mt-0.5 text-lg font-black text-slate-900">{m.value}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/60">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(m.pct, 100)}%`,
                background: `linear-gradient(90deg, ${m.color}, ${m.color}cc)`,
                boxShadow: m.pct > 0 ? `0 1px 6px ${m.color}55` : "none",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [timeWindow, setTimeWindow] = useState<"today" | "week" | "month" | "custom">("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split("T")[0];
  }, []);

  const monthStartStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }, []);

  const { data: entries = [] } = useCollectionQuery<ProductionEntry>(
    "productionEntries", [orderBy("date", "desc"), limit(2000)], { staleTime: 30 * 1000 },
  );

  const { data: sales = [] } = useCollectionQuery<SaleTransaction>(
    "saleTransactions", [orderBy("date", "desc"), limit(2000)], { staleTime: 30 * 1000 },
  );

  const { data: expenses = [] } = useCollectionQuery<Expense>(
    "expenses", [orderBy("date", "desc"), limit(2000)], { staleTime: 30 * 1000 },
  );

  const { data: employees = [], isLoading: empLoading } = useCollectionQuery<Employee>(
    "employees", [orderBy("name")], { staleTime: 10 * 60 * 1000 },
  );

  const { data: stockIns = [] } = useCollectionQuery<StockIn>(
    "stockIns", [orderBy("date", "desc"), limit(2000)], { staleTime: 60 * 1000 },
  );

  const { data: stockOuts = [] } = useCollectionQuery<StockOut>(
    "stockOuts", [orderBy("date", "desc"), limit(2000)], { staleTime: 60 * 1000 },
  );

  const { data: batches = [] } = useCollectionQuery<Batch>(
    "batches", [orderBy("startDate", "desc"), limit(100)], { staleTime: 2 * 60 * 1000 },
  );

  const loading = empLoading;

  const filteredEntries = useMemo(
    () => entries.filter((e) => filterDate(e.date, e.date, timeWindow, todayStr, weekStart, monthStartStr, customStart, customEnd)),
    [entries, timeWindow, todayStr, weekStart, monthStartStr, customStart, customEnd],
  );

  const filteredSales = useMemo(
    () => sales.filter((s) => filterDate(s.date, s.date, timeWindow, todayStr, weekStart, monthStartStr, customStart, customEnd)),
    [sales, timeWindow, todayStr, weekStart, monthStartStr, customStart, customEnd],
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((ex) => filterDate(ex.date, ex.date, timeWindow, todayStr, weekStart, monthStartStr, customStart, customEnd)),
    [expenses, timeWindow, todayStr, weekStart, monthStartStr, customStart, customEnd],
  );

  const totalPiecesProduced = useMemo(
    () => filteredEntries.reduce((s, e) => s + e.actualPieces, 0),
    [filteredEntries],
  );

  const totalRevenue = useMemo(
    () => filteredSales.reduce((s, t) => s + t.totalAmount, 0),
    [filteredSales],
  );

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((s, ex) => s + ex.amountUgx, 0),
    [filteredExpenses],
  );

  const netProfit = totalRevenue - totalExpenses;

  const activeWorkersToday = useMemo(
    () => new Set(entries.filter((e) => e.date === todayStr).map((e) => e.employeeId)).size,
    [entries, todayStr],
  );

  const stockByPack = useMemo(() => {
    const byPack: Record<string, number> = {};
    stockIns.forEach((si) => {
      byPack[si.packSize] = (byPack[si.packSize] || 0) + si.quantity;
    });
    stockOuts.forEach((so) => {
      byPack[so.packSize] = (byPack[so.packSize] || 0) - so.quantity;
    });
    return byPack;
  }, [stockIns, stockOuts]);

  const totalPadsInStock = useMemo(
    () =>
      Object.entries(stockByPack).reduce(
        (sum, [size, qty]) => sum + qty * (PACK_SIZES[size as PackSize] || 0),
        0,
      ),
    [stockByPack],
  );

  const activeBatch = useMemo(() => batches.find((b) => b.status === "ACTIVE"), [batches]);

  const batchProgress = useMemo(
    () =>
      activeBatch
        ? Math.min(100, Math.round(
            (stockIns.filter((si) => si.batchRef === activeBatch.id).reduce((s, si) => s + si.quantity, 0) / 5000) * 100,
          ))
        : 0,
    [activeBatch, stockIns],
  );

  const achievementValues = useMemo(
    () => filteredEntries.filter((e) => e.targetPieces > 0).map((e) => e.performancePct),
    [filteredEntries],
  );

  const avgAchievement = useMemo(
    () =>
      achievementValues.length > 0
        ? Math.round(achievementValues.reduce((s, v) => s + v, 0) / achievementValues.length)
        : 0,
    [achievementValues],
  );

  const workerPerf = useMemo(() => {
    const monthStart = new Date();
    const ms = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`;
    const perf: { label: string; value: number; color: string }[] = [];
    employees
      .filter((e) => e.isActive)
      .slice(0, 10)
      .forEach((emp) => {
        const workerEntries = entries.filter((e) => e.employeeId === emp.id && e.date >= ms);
        if (workerEntries.length > 0) {
          const avgPct = Math.round(
            workerEntries.reduce((s, e) => s + e.performancePct, 0) / workerEntries.length,
          );
          perf.push({
            label: emp.name.split(" ")[0],
            value: avgPct,
            color: colorWheel[perf.length % colorWheel.length],
          });
        }
      });
    return perf.sort((a, b) => b.value - a.value);
  }, [employees, entries]);

  const perfTrend = useMemo(() => {
    const trend: { label: string; pct: number; target: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayEntries = entries.filter((e) => e.date === key && e.targetPieces > 0);
      const avg =
        dayEntries.length > 0
          ? Math.round(dayEntries.reduce((s, e) => s + e.performancePct, 0) / dayEntries.length)
          : 0;
      trend.push({ label: key.slice(5), pct: avg, target: 100 });
    }
    return trend;
  }, [entries]);

  const stockPadsByPack = useMemo(() => {
    return Object.entries(stockByPack)
      .filter(([, qty]) => qty > 0)
      .map(([size, qty], i) => ({
        name: size
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        value: qty * (PACK_SIZES[size as PackSize] || 0),
        fill: chartColors[i % chartColors.length],
      }));
  }, [stockByPack]);

  const monthlyCumulativeFinData = useMemo(() => {
    const points: { label: string; revenue: number; expenses: number }[] = [];
    let cumRevenue = 0;
    let cumExpenses = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      cumRevenue += filteredSales
        .filter((s) => s.date === key)
        .reduce((sum, s) => sum + s.totalAmount, 0);
      cumExpenses += filteredExpenses
        .filter((e) => e.date === key)
        .reduce((sum, e) => sum + e.amountUgx, 0);
      points.push({ label: key.slice(5), revenue: cumRevenue, expenses: cumExpenses });
    }
    return points;
  }, [filteredSales, filteredExpenses]);

  const expenseCategoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      cats[e.category] = (cats[e.category] || 0) + e.amountUgx;
    });
    return Object.entries(cats)
      .map(([name, value]) => ({
        name: name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
        color: expenseColorMap[name] || chartColors[0],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const dailyProduction7 = useMemo(() => {
    const bars: { label: string; value: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayTotal = entries
        .filter((e) => e.date === key)
        .reduce((sum, e) => sum + e.actualPieces, 0);
      bars.push({
        label: dayLabels[d.getDay()],
        value: dayTotal,
        isToday: i === 0,
      });
    }
    return bars;
  }, [entries]);

  const expenseTotal = expenseCategoryData.reduce((s, d) => s + d.value, 0);
  const emptyLabel = "No data for this period yet.";

  const handleGenerateReport = useCallback(async (selection: PeriodSelection) => {
    const params = new URLSearchParams({
      screen: "analytics",
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
    a.download = `analytics-report-${selection.startDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Loading analytics...</div>;
  }

  const kpiMetrics = [
    {
      label: "Pads Produced",
      value: totalPiecesProduced.toLocaleString(),
      color: "green" as const,
    },
    {
      label: "Current Stock",
      value: `${totalPadsInStock.toLocaleString()} pads`,
      color: "blue" as const,
    },
    {
      label: "Net Profit",
      value: `UGX ${netProfit.toLocaleString()}`,
      color: netProfit >= 0 ? ("green" as const) : ("red" as const),
    },
    {
      label: "Active Workers",
      value: activeWorkersToday,
      color: "default" as const,
    },
    {
      label: "Total Revenue",
      value: `UGX ${totalRevenue.toLocaleString()}`,
      color: "green" as const,
    },
    {
      label: "Total Expenses",
      value: `UGX ${totalExpenses.toLocaleString()}`,
      color: "red" as const,
    },
  ];

  return (
    <RouteGuard>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {(["today", "week", "month", "custom"] as const).map((tw) => (
                <button
                  key={tw}
                  onClick={() => setTimeWindow(tw)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    timeWindow === tw
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tw === "today" ? "Today" : tw === "week" ? "This Week" : tw === "month" ? "This Month" : "Custom"}
                </button>
              ))}
            </div>
            {timeWindow === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-36"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm w-36"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpiMetrics.map((m) => (
            <KpiCard key={m.label} label={m.label} value={m.value} color={m.color} />
          ))}
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ComboBarLineChart
              data={perfTrend}
              barKey="pct"
              barName="Performance"
              barColor={palette.violet}
              lineKey="target"
              lineName="Target (100%)"
              lineColor={palette.emerald}
              title="Performance Trend"
              subtitle="30-day rolling average worker performance"
              height={220}
              badge={
                avgAchievement > 0
                  ? { label: "Avg", value: `${avgAchievement}%`, color: avgAchievement >= 70 ? "green" : "amber" }
                  : undefined
              }
            />

            <ChartCard
              title="Worker Achievement"
              subtitle="Monthly avg performance ranking"
              variant="gradient"
              badge={
                workerPerf.length > 0
                  ? { label: "Active", value: String(workerPerf.length), color: "blue" }
                  : undefined
              }
            >
              {workerPerf.length === 0 ? (
                <div className="flex h-full items-center justify-center text-[11px] font-semibold text-slate-400">
                  {emptyLabel}
                </div>
              ) : (
                <GradientHorizontalBarChart
                  data={workerPerf.map((w) => ({ label: w.label, value: w.value }))}
                  title=""
                  height={Math.max(workerPerf.length * 36, 120)}
                  gradientStart={palette.violet}
                  gradientEnd={palette.sky}
                  showGrid={false}
                  labelWidth={70}
                />
              )}
            </ChartCard>

            <ChartCard
              title="Batch Progress"
              subtitle={activeBatch ? `Batch: ${activeBatch.id}` : "No active batch"}
              variant="gradient"
              badge={
                batchProgress > 0
                  ? { label: "Complete", value: `${batchProgress}%`, color: batchProgress >= 80 ? "green" : "blue" }
                  : undefined
              }
            >
              <div className="flex flex-1 items-center justify-center">
                <GaugeChart
                  value={batchProgress}
                  max={100}
                  label="Batch"
                  subLabel={`${batchProgress}% of 5000 packs`}
                  color={batchProgress >= 80 ? palette.emerald : batchProgress >= 50 ? palette.violet : palette.yellow}
                  size={140}
                  variant="circular"
                />
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <RadialBarChart
              data={stockPadsByPack}
              title="Stock Distribution"
              subtitle="Pads in stock by pack size"
              height={220}
              badge={
                totalPadsInStock > 0
                  ? { label: "Total", value: `${formatCompact(totalPadsInStock)} pads`, color: "teal" }
                  : undefined
              }
              innerRadius="15%"
              outerRadius="85%"
            />

            <StackedAreaChart
              data={monthlyCumulativeFinData}
              series={[
                { dataKey: "revenue", name: "Revenue", color: palette.emerald },
                { dataKey: "expenses", name: "Expenses", color: palette.rose },
              ]}
              title="Revenue vs Expenses"
              subtitle="30-day cumulative (all data)"
              height={220}
              badge={
                totalRevenue > 0
                  ? { label: "Net", value: formatCurrency(netProfit), color: netProfit >= 0 ? "green" : "red" }
                  : undefined
              }
            />

            <PieWithLegendChart
              data={expenseCategoryData}
              title="Expense Categories"
              subtitle={`${filteredExpenses.length} transactions`}
              height={140}
              innerRadius={45}
              outerRadius={70}
              formatValue={formatCurrency}
              centerLabel={expenseTotal > 0 ? formatCompact(expenseTotal) : undefined}
              centerSubLabel={expenseTotal > 0 ? "Total" : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ChartCard
              title="Daily Production"
              subtitle="7-day pieces produced"
              variant="gradient"
              badge={
                dailyProduction7.some((d) => d.value > 0)
                  ? { label: "Today", value: formatCompact(dailyProduction7[6]?.value ?? 0), color: "purple" }
                  : undefined
              }
            >
              <DailyProductionMini data={dailyProduction7} />
            </ChartCard>

            <ChartCard
              title="Worker Detail"
              subtitle="Ranked by avg achievement this month"
              variant="gradient"
              badge={
                workerPerf.length > 0
                  ? { label: "Top", value: `${workerPerf[0]?.value ?? 0}%`, color: "green" }
                  : undefined
              }
            >
              <WorkerDetailBars data={workerPerf} />
            </ChartCard>

            <ChartCard
              title="KPI Overview"
              subtitle="Key metrics at a glance"
              variant="gradient"
            >
              <AnalyticsKPIOverview
                pieces={totalPiecesProduced}
                workers={activeWorkersToday}
                achievement={avgAchievement}
                batchPct={batchProgress}
              />
            </ChartCard>
          </div>
        </div>

        <ReportCard title="Analytics Report" subtitle="Download a PDF with comprehensive analytics data" onGenerate={handleGenerateReport} />
      </div>
    </RouteGuard>
  );
}
