"use client";

import { useState, useMemo, useCallback } from "react";
import {
  collection,
  addDoc,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Expense, ExpenseCategory } from "@/types";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { ChartCard } from "@/components/ui/ChartCard";
import { useCollectionQuery } from "@/hooks/use-firestore-query";
import { PieWithLegendChart } from "@/components/charts/PieWithLegendChart";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { AreaRangeChart } from "@/components/charts/AreaRangeChart";
import { BubbleChart } from "@/components/charts/BubbleChart";
import { palette } from "@/components/charts";
import { ReportCard } from "@/components/reports/ReportCard";
import type { PeriodSelection } from "@/components/reports/PeriodSelector";

type AnalyticsPeriod = "week" | "month" | "12months" | "custom";

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

const CATEGORY_OPTIONS: ExpenseCategory[] = [
  "RAW_MATERIALS", "LABOUR", "UTILITIES", "TRANSPORT",
  "PACKAGING_SUPPLIES", "EQUIPMENT_MAINTENANCE", "MARKETING", "MISCELLANEOUS",
];

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  RAW_MATERIALS: "Raw Materials",
  LABOUR: "Labour",
  UTILITIES: "Utilities",
  TRANSPORT: "Transport",
  PACKAGING_SUPPLIES: "Packaging Supplies",
  EQUIPMENT_MAINTENANCE: "Equipment Maintenance",
  MARKETING: "Marketing",
  MISCELLANEOUS: "Miscellaneous",
};

const COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#6b7280",
];

export default function ExpensesPage() {
  const [saving, setSaving] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "RAW_MATERIALS" as ExpenseCategory,
    description: "",
    amountUgx: 0,
    paidBy: "",
    receiptRef: "",
  });

  const { data: expenses = [], isLoading: loading } = useCollectionQuery<Expense>(
    "expenses", [orderBy("date", "desc")], { staleTime: 30 * 1000 }
  );

  const periodBounds = useMemo(
    () => getPeriodBounds(analyticsPeriod, customStart, customEnd),
    [analyticsPeriod, customStart, customEnd]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.date >= periodBounds.start && e.date <= periodBounds.end),
    [expenses, periodBounds]
  );

  const { data: employees = [] } = useCollectionQuery<{ id: string; name: string }>(
    "employees", [orderBy("name")], { staleTime: 10 * 60 * 1000 }
  );

  const today = new Date().toISOString().split("T")[0];

  const todayExpenses = useMemo(
    () => expenses.filter((e) => e.date === today),
    [expenses, today]
  );

  const dailyTotal = useMemo(
    () => todayExpenses.reduce((s, e) => s + e.amountUgx, 0),
    [todayExpenses]
  );

  const weeklyTotal = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return expenses
      .filter((e) => new Date(e.date) >= weekStart)
      .reduce((s, e) => s + e.amountUgx, 0);
  }, [expenses]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amountUgx;
    });
    return map;
  }, [filteredExpenses]);

  const categoryData = useMemo(
    () => Object.entries(byCategory).map(([name, value], i) => ({
      name: CATEGORY_LABELS[name as ExpenseCategory] || name,
      value,
      color: COLORS[i % COLORS.length],
    })),
    [byCategory]
  );

  const monthlyTotal = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.amountUgx, 0);
  }, [expenses]);

  const dailyTrendData = useMemo(() => {
    const trend: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      trend.push({
        label: key.slice(5),
        total: filteredExpenses.filter((e) => e.date === key).reduce((s, e) => s + e.amountUgx, 0),
      });
    }
    return trend;
  }, [filteredExpenses]);

  const expenseRangeData = useMemo(() => {
    const range: { label: string; min: number; max: number; line: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayExps = filteredExpenses.filter((e) => e.date === key);
      const amounts = dayExps.map((e) => e.amountUgx);
      range.push({
        label: key.slice(5),
        min: amounts.length > 0 ? Math.min(...amounts) : 0,
        max: amounts.length > 0 ? Math.max(...amounts) : 0,
        line: amounts.length > 0 ? Math.round(amounts.reduce((s, v) => s + v, 0) / amounts.length) : 0,
      });
    }
    return range;
  }, [filteredExpenses]);

  const topExpenses = useMemo(() => {
    return filteredExpenses
      .sort((a, b) => b.amountUgx - a.amountUgx)
      .slice(0, 30)
      .map((e, i) => ({
        label: CATEGORY_LABELS[e.category] || e.category,
        x: i,
        y: e.amountUgx,
        z: e.amountUgx,
      }));
  }, [filteredExpenses]);

  const categorySummary = useMemo(() => {
    const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
    return Object.entries(byCategory)
      .map(([cat, amt]) => ({
        label: CATEGORY_LABELS[cat as ExpenseCategory] || cat,
        value: amt,
        pct: total > 0 ? Math.round((amt / total) * 100) : 0,
        color: COLORS[CATEGORY_OPTIONS.indexOf(cat as ExpenseCategory) % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [byCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "expenses"), {
        ...form,
        createdAt: Timestamp.now(),
      });
      setForm({
        date: new Date().toISOString().split("T")[0],
        category: "RAW_MATERIALS", description: "",
        amountUgx: 0, paidBy: "", receiptRef: "",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateReport = useCallback(async (selection: PeriodSelection) => {
    const params = new URLSearchParams({
      screen: "expenses",
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
    a.download = `expenses-report-${selection.startDate}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <RouteGuard>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
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
                {p === "week" ? "Last Week" : p === "month" ? "Last Month" : p === "12months" ? "12 Months" : "Custom"}
              </button>
            ))}
          </div>
          {analyticsPeriod === "custom" && (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ChartCard title="Today" subtitle="Daily expense total" variant="gradient" accentColor={palette.red}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-red-500">UGX {dailyTotal.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mt-1">today</span>
          </div>
        </ChartCard>

        <ChartCard title="This Week" subtitle="Weekly expense total" variant="gradient" accentColor={palette.orange}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-orange-500">UGX {weeklyTotal.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mt-1">this week</span>
          </div>
        </ChartCard>

        <ChartCard title="This Month" subtitle="Monthly expense total" variant="gradient" accentColor={palette.violet}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-violet-500">UGX {monthlyTotal.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mt-1">this month</span>
          </div>
        </ChartCard>

        <MultiLineChart
          data={dailyTrendData}
          series={[{ dataKey: "total", name: "Daily Total", color: palette.rose }]}
          title="Daily Trend"
          subtitle="Last 7 days"
          height={260}
          showLegend={false}
        />

        <PieWithLegendChart
          data={categoryData.length > 0 ? categoryData : []}
          title="Expenses by Category"
          height={280}
          formatValue={(v) => `UGX ${v.toLocaleString()}`}
        />

        <AreaRangeChart
          data={expenseRangeData}
          title="Expense Range"
          subtitle="Min / avg / max per day"
          color={palette.blue}
          height={260}
        />

        <BubbleChart
          data={topExpenses}
          title="Top Expenses"
          subtitle="Largest individual costs"
          height={260}
        />

        <ChartCard title="Recent Expenses" subtitle="Latest entries" variant="gradient">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No expenses recorded for this period.</div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[220px]">
              {filteredExpenses.slice(0, 8).map((e) => (
                <div key={e.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{CATEGORY_LABELS[e.category] || e.category}</p>
                    <p className="text-[10px] text-gray-400">{e.description} · {e.date}</p>
                  </div>
                  <span className="text-xs font-semibold text-red-500">UGX {e.amountUgx.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Category Summary" subtitle="% of total spend" variant="gradient">
          {categorySummary.length > 0 ? (
            <div className="space-y-2.5">
              {categorySummary.slice(0, 7).map((c) => (
                <div key={c.label}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-semibold text-gray-700 truncate mr-2">{c.label}</span>
                    <span className="text-gray-500 shrink-0">{c.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>
          )}
        </ChartCard>
      </div>

      <ReportCard title="Expenses Report" subtitle="Download a PDF summary of expense data" onGenerate={handleGenerateReport} />

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Expense Entry</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (UGX)</label>
            <input type="number" value={form.amountUgx || ""} onChange={(e) => setForm({ ...form, amountUgx: parseInt(e.target.value) || 0 })}
              required min={0} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
            <select value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
              required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">Select...</option>
              {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Ref</label>
            <input type="text" value={form.receiptRef} onChange={(e) => setForm({ ...form, receiptRef: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Optional" />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="py-2 px-6 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50">
            {saving ? "Saving..." : "Record Expense"}
          </button>
        </div>
      </form>


    </div>
    </RouteGuard>
  );
}
